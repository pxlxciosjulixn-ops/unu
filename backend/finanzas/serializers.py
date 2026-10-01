from __future__ import annotations

from rest_framework import serializers

from finanzas import models
from finanzas.conceptos import clave, homogenizar


class MovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Movimiento
        fields = ["id", "fecha", "tipo", "concepto", "valor", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_concepto(self, valor: str) -> str:
        # "mt15" se guarda como "Mt15" y "Mercado " como "Mercado": así el
        # dashboard suma junto todo lo de un mismo concepto.
        limpio = homogenizar(valor)
        if not limpio:
            raise serializers.ValidationError("Escribe el concepto.")
        return limpio


class SugerenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Sugerencia
        fields = ["id", "nombre", "grupo", "presupuesto", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_nombre(self, valor: str) -> str:
        limpio = " ".join(valor.split())
        if not limpio:
            raise serializers.ValidationError("Escribe el concepto.")
        # `clave` es único en la tabla, pero el choque se avisa aquí para que
        # el mensaje diga qué pasó en vez de reventar con un IntegrityError.
        repetida = models.Sugerencia.objects.filter(clave=clave(limpio))
        if self.instance is not None:
            repetida = repetida.exclude(pk=self.instance.pk)
        if repetida.exists():
            raise serializers.ValidationError("Esa sugerencia ya está en la lista.")
        return limpio


class CargoCreditoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CargoCredito
        fields = ["id", "fecha", "tipo", "valor", "nota", "created_at"]
        read_only_fields = ["id", "created_at"]


def _pagos_del_credito(credito: models.Credito, movimientos: list, saldo: int) -> dict:
    """
    Con la cuota: lo que falta pagar este mes, el próximo pago y la cuota del
    mes siguiente. Sin cuota no hay a qué compararlo.
    """
    from django.utils import timezone

    from finanzas.calculos import mes_siguiente, primer_dia

    vacio = {"pendiente_mes": 0, "proximo": None, "siguiente": 0}
    if not credito.cuota:
        return vacio
    actual = primer_dia(timezone.localdate())
    siguiente = mes_siguiente(actual)
    pagado_mes = sum(
        m.valor
        for m in movimientos
        if m.tipo == models.Movimiento.Tipo.GASTO and primer_dia(m.fecha) == actual
    )
    pendiente = max(credito.cuota - pagado_mes, 0)
    if saldo <= 0:
        return vacio
    # Si ya se va a terminar de pagar, la última cuota es lo que quede.
    siguiente_cuota = min(credito.cuota, max(saldo - pendiente, 0))
    proximo = (
        {"mes": f"{actual:%Y-%m}", "valor": pendiente}
        if pendiente
        else {"mes": f"{siguiente:%Y-%m}", "valor": siguiente_cuota}
    )
    return {"pendiente_mes": pendiente, "proximo": proximo, "siguiente": siguiente_cuota}


class CreditoSerializer(serializers.ModelSerializer):
    """
    El crédito con su saldo ya calculado: lo inicial, menos los abonos
    (gastos con ese concepto), más los avances (ingresos con ese concepto),
    más los cargos (intereses, manejo, seguro…).
    """

    abonado = serializers.SerializerMethodField()
    capital_abonado = serializers.SerializerMethodField()
    costos_en_pagos = serializers.SerializerMethodField()
    avances = serializers.SerializerMethodField()
    total_cargos = serializers.SerializerMethodField()
    cargos = CargoCreditoSerializer(many=True, read_only=True)
    pendiente_mes = serializers.SerializerMethodField()
    proximo = serializers.SerializerMethodField()
    siguiente = serializers.SerializerMethodField()
    saldo = serializers.SerializerMethodField()
    ultimo_movimiento = serializers.SerializerMethodField()

    class Meta:
        model = models.Credito
        fields = [
            "id",
            "nombre",
            "saldo_inicial",
            "fecha_inicio",
            "cupo",
            "cuota",
            "tasa_ea",
            "costo_pct",
            "abonado",
            "capital_abonado",
            "costos_en_pagos",
            "avances",
            "total_cargos",
            "cargos",
            "pendiente_mes",
            "proximo",
            "siguiente",
            "saldo",
            "ultimo_movimiento",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def _cuentas(self, credito: models.Credito) -> dict:
        # Se calcula una vez por crédito y se reparte entre los campos.
        cache = self.context.setdefault("_cuentas", {})
        if credito.pk not in cache:
            movimientos = credito.movimientos()
            gasto = models.Movimiento.Tipo.GASTO
            abonado = sum(m.valor for m in movimientos if m.tipo == gasto)
            avances = sum(m.valor for m in movimientos if m.tipo != gasto)
            cargos = sum(c.valor for c in credito.cargos.all())
            # De lo pagado, la parte de intereses y seguros no baja la deuda.
            pct = float(credito.costo_pct or 0) / 100
            costos = round(abonado * pct)
            capital = abonado - costos
            saldo = credito.saldo_inicial - capital + avances + cargos
            cache[credito.pk] = {
                "abonado": abonado,
                "capital": capital,
                "costos": costos,
                "avances": avances,
                "cargos": cargos,
                "saldo": saldo,
                **_pagos_del_credito(credito, movimientos, saldo),
                "ultimo": movimientos[-1].fecha if movimientos else None,
            }
        return cache[credito.pk]

    def get_abonado(self, credito) -> int:
        return self._cuentas(credito)["abonado"]

    def get_capital_abonado(self, credito) -> int:
        return self._cuentas(credito)["capital"]

    def get_costos_en_pagos(self, credito) -> int:
        return self._cuentas(credito)["costos"]

    def get_avances(self, credito) -> int:
        return self._cuentas(credito)["avances"]

    def get_pendiente_mes(self, credito) -> int:
        return self._cuentas(credito)["pendiente_mes"]

    def get_proximo(self, credito):
        return self._cuentas(credito)["proximo"]

    def get_siguiente(self, credito) -> int:
        return self._cuentas(credito)["siguiente"]

    def get_total_cargos(self, credito) -> int:
        return self._cuentas(credito)["cargos"]

    def get_saldo(self, credito) -> int:
        return self._cuentas(credito)["saldo"]

    def get_ultimo_movimiento(self, credito):
        return self._cuentas(credito)["ultimo"]

    def validate_nombre(self, valor: str) -> str:
        limpio = homogenizar(valor)
        if not limpio:
            raise serializers.ValidationError("Escribe el nombre del crédito.")
        repetido = models.Credito.objects.filter(clave=clave(limpio))
        if self.instance is not None:
            repetido = repetido.exclude(pk=self.instance.pk)
        if repetido.exists():
            raise serializers.ValidationError("Ese crédito ya está registrado.")
        if models.GastoFijo.objects.filter(clave=clave(limpio)).exists():
            raise serializers.ValidationError("Ese concepto ya es un gasto fijo.")
        return limpio

    def save(self, **kwargs):
        credito = super().save(**kwargs)
        # El concepto del crédito se sugiere al escribir y cuenta como deuda
        # en el dashboard.
        models.Sugerencia.objects.update_or_create(
            clave=credito.clave,
            defaults={"nombre": credito.nombre, "grupo": models.Sugerencia.Grupo.DEUDA},
        )
        return credito


class GastoFijoSerializer(serializers.ModelSerializer):
    """El gasto fijo con lo que se debe este mes y los últimos meses."""

    este_mes = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()
    historial = serializers.SerializerMethodField()
    pendiente_mes = serializers.SerializerMethodField()
    proximo = serializers.SerializerMethodField()
    siguiente = serializers.SerializerMethodField()

    class Meta:
        model = models.GastoFijo
        fields = [
            "id",
            "nombre",
            "monto",
            "dia_pago",
            "fecha_inicio",
            "fecha_fin",
            "este_mes",
            "estado",
            "historial",
            "pendiente_mes",
            "proximo",
            "siguiente",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def _cuentas(self, fijo: models.GastoFijo) -> dict:
        from django.utils import timezone

        from finanzas import fijos

        cache = self.context.setdefault("_fijos", {})
        if fijo.pk not in cache:
            cache[fijo.pk] = fijos.estado(fijo, timezone.localdate())
        return cache[fijo.pk]

    def get_este_mes(self, fijo) -> dict:
        return self._cuentas(fijo)["este_mes"]

    def get_estado(self, fijo) -> str:
        return self._cuentas(fijo)["estado"]

    def get_historial(self, fijo) -> list:
        return self._cuentas(fijo)["historial"]

    def get_pendiente_mes(self, fijo) -> int:
        return self._cuentas(fijo)["pendiente_mes"]

    def get_proximo(self, fijo):
        return self._cuentas(fijo)["proximo"]

    def get_siguiente(self, fijo) -> int:
        return self._cuentas(fijo)["siguiente"]

    def validate(self, datos):
        inicio = datos.get("fecha_inicio", getattr(self.instance, "fecha_inicio", None))
        fin = datos.get("fecha_fin", getattr(self.instance, "fecha_fin", None))
        if inicio and fin and fin.replace(day=1) < inicio.replace(day=1):
            raise serializers.ValidationError(
                {"fecha_fin": "El último mes no puede ser antes del primero."}
            )
        return datos

    def validate_nombre(self, valor: str) -> str:
        limpio = homogenizar(valor)
        if not limpio:
            raise serializers.ValidationError("Elige el concepto.")
        llave = clave(limpio)
        repetido = models.GastoFijo.objects.filter(clave=llave)
        if self.instance is not None:
            repetido = repetido.exclude(pk=self.instance.pk)
        if repetido.exists():
            raise serializers.ValidationError("Ese gasto fijo ya está registrado.")
        # Un concepto no puede ser crédito y gasto fijo: el mismo pago
        # contaría dos veces.
        if models.Credito.objects.filter(clave=llave).exists():
            raise serializers.ValidationError("Ese concepto ya es un crédito.")
        return limpio

    def save(self, **kwargs):
        fijo = super().save(**kwargs)
        # Que se sugiera al escribir; si ya estaba, se respeta su grupo.
        models.Sugerencia.objects.get_or_create(
            clave=fijo.clave, defaults={"nombre": fijo.nombre}
        )
        return fijo


class ConfiguracionFinanzasSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ConfiguracionFinanzas
        fields = ["salario", "updated_at"]
        read_only_fields = ["updated_at"]
