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


class CreditoSerializer(serializers.ModelSerializer):
    """
    El crédito con su saldo ya calculado: lo inicial, menos los abonos
    (gastos con ese concepto), más los avances (ingresos con ese concepto).
    """

    abonado = serializers.SerializerMethodField()
    avances = serializers.SerializerMethodField()
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
            "abonado",
            "avances",
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
            cache[credito.pk] = {
                "abonado": abonado,
                "avances": avances,
                "saldo": credito.saldo_inicial - abonado + avances,
                "ultimo": movimientos[-1].fecha if movimientos else None,
            }
        return cache[credito.pk]

    def get_abonado(self, credito) -> int:
        return self._cuentas(credito)["abonado"]

    def get_avances(self, credito) -> int:
        return self._cuentas(credito)["avances"]

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
