import json
from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from finanzas import analisis
from finanzas.models import AjusteVisual, Credito, GastoFijo, Movimiento, Sugerencia


def anotar(fecha: str, tipo: str, concepto: str, valor: int) -> None:
    Movimiento.objects.create(
        fecha=date.fromisoformat(fecha), tipo=tipo, concepto=concepto, valor=valor
    )


class AnalisisTests(TestCase):
    def setUp(self):
        # Junio a septiembre: sueldo y Nu todos los meses, comida suelta.
        for mes in (6, 7, 8, 9):
            anotar(f"2026-{mes:02d}-01", "ingreso", "Sueldo", 2_000_000)
            anotar(f"2026-{mes:02d}-05", "gasto", "Nu", 300_000)
            anotar(f"2026-{mes:02d}-10", "gasto", "Comida", 30_000 * 30)
        anotar("2026-07-15", "gasto", "Ropa", 100_000)

    def test_recurrentes_salen_con_su_monto(self):
        recs = {r.concepto: r for r in analisis.recurrentes(date(2026, 10, 3))}
        self.assertEqual(recs["Sueldo"].monto, 2_000_000)
        self.assertEqual(recs["Nu"].monto, 300_000)
        self.assertNotIn("Ropa", recs)

    def test_proyeccion_suma_lo_pendiente_y_estira_el_resto(self):
        anotar("2026-10-01", "ingreso", "Sueldo", 2_000_000)
        anotar("2026-10-02", "gasto", "Comida", 60_000)
        p = analisis.proyeccion(date(2026, 10, 2))
        # Nu no ha salido: va entero. De la comida falta lo que no se ha gastado.
        pendientes = {r.concepto: r.pendiente for r in p.pendientes}
        self.assertEqual(pendientes, {"Nu": 300_000, "Comida": 840_000})
        self.assertEqual(p.ingresos_final, 2_000_000)
        # Encima va el gasto suelto (la ropa de julio) estirado a los días
        # que faltan: un poco, no una ropa entera.
        fijo = 60_000 + 300_000 + 840_000
        self.assertGreater(p.gastos_final, fijo)
        self.assertLess(p.gastos_final, fijo + 100_000)

    def test_saldo_anterior_arrastra_lo_que_sobro(self):
        # Cada mes: entran 2.000.000 y salen 1.200.000 (Nu + comida).
        self.assertEqual(analisis.saldo_anterior(date(2026, 7, 1)), 800_000)
        # Julio tuvo además la ropa: lo que sobra se va sumando de mes a mes.
        self.assertEqual(
            analisis.saldo_anterior(date(2026, 10, 1)), 800_000 * 4 - 100_000
        )
        self.assertEqual(analisis.saldo_anterior(date(2026, 6, 1)), 0)
        p = analisis.proyeccion(date(2026, 10, 2))
        self.assertEqual(p.saldo_anterior, 3_100_000)

    def test_proyeccion_cuenta_la_segunda_quincena(self):
        anotar("2026-10-01", "ingreso", "Sueldo", 1_000_000)
        p = analisis.proyeccion(date(2026, 10, 2))
        self.assertEqual(p.ingresos_final, 2_000_000)

    def test_presupuesto_cuenta_lo_del_mes(self):
        Sugerencia.objects.update_or_create(
            nombre="Comida", defaults={"presupuesto": 600_000}
        )
        (estado,) = analisis.presupuestos(date(2026, 9, 1))
        self.assertEqual(estado.gastado, 900_000)
        self.assertEqual(round(estado.pct), 150)

    def test_gasto_fuera_de_lo_normal(self):
        anotar("2026-09-20", "gasto", "Nu", 900_000)
        raros = analisis.fuera_de_lo_normal(date(2026, 9, 25))
        self.assertEqual([(m.valor, usual) for m, usual in raros], [(900_000, 300_000)])

    def test_grupos(self):
        totales = analisis.por_grupo(date(2026, 9, 1), date(2026, 10, 1))
        self.assertEqual(totales["deuda"], 300_000)
        self.assertEqual(totales["comida"], 900_000)


class EndpointsTests(TestCase):
    def setUp(self):
        self.cliente = APIClient(HTTP_HOST="localhost")

    def test_ajustes_por_ip(self):
        self.cliente.put(
            "/api/finanzas/ajustes/",
            {"estilo": "y2k", "tema": "oscuro", "otro": "x"},
            format="json",
            REMOTE_ADDR="1.2.3.4",
        )
        propia = self.cliente.get("/api/finanzas/ajustes/", REMOTE_ADDR="1.2.3.4")
        ajena = self.cliente.get("/api/finanzas/ajustes/", REMOTE_ADDR="5.6.7.8")
        self.assertEqual(propia.json(), {"estilo": "y2k", "tema": "oscuro"})
        self.assertEqual(ajena.json(), {})
        self.assertEqual(AjusteVisual.objects.count(), 1)

    def test_sugerencia_con_grupo_y_presupuesto(self):
        fila = Sugerencia.objects.get(nombre="Nu")
        self.assertEqual(fila.grupo, "deuda")
        r = self.cliente.patch(
            f"/api/finanzas/sugerencias/{fila.pk}/",
            {"presupuesto": 400_000, "grupo": "hogar"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["presupuesto"], 400_000)
        self.assertEqual(r.json()["grupo"], "hogar")


class CreditosTests(TestCase):
    def setUp(self):
        self.cliente = APIClient(HTTP_HOST="localhost")

    def test_abonos_bajan_y_avances_suben(self):
        r = self.cliente.post(
            "/api/finanzas/creditos/",
            {
                "nombre": "lucky plata",
                "saldo_inicial": 1_000_000,
                "fecha_inicio": "2026-09-01",
                "cupo": 2_000_000,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        anotar("2026-08-30", "gasto", "Lucky Plata", 999)  # antes del inicio
        anotar("2026-09-05", "gasto", "Lucky Plata", 200_000)
        anotar("2026-09-10", "ingreso", "lucky plata", 50_000)
        anotar("2026-09-11", "gasto", "Comida", 10_000)
        (credito,) = self.cliente.get("/api/finanzas/creditos/").json()
        self.assertEqual(credito["abonado"], 200_000)
        self.assertEqual(credito["avances"], 50_000)
        self.assertEqual(credito["saldo"], 850_000)
        # Su concepto queda como sugerencia del grupo Deudas.
        sugerencia = Sugerencia.objects.get(nombre__iexact="lucky plata")
        self.assertEqual(sugerencia.grupo, "deuda")

    def test_no_se_repite(self):
        datos = {"nombre": "Nu", "saldo_inicial": 1, "fecha_inicio": "2026-09-01"}
        self.cliente.post("/api/finanzas/creditos/", datos, format="json")
        r = self.cliente.post(
            "/api/finanzas/creditos/", {**datos, "nombre": "NU "}, format="json"
        )
        self.assertEqual(r.status_code, 400)


class ExportarTests(TestCase):
    def test_trae_todo_menos_los_ajustes(self):
        anotar("2026-09-05", "gasto", "Nu", 100_000)
        Credito.objects.create(
            nombre="Nu", saldo_inicial=500_000, fecha_inicio=date(2026, 9, 1)
        )
        AjusteVisual.objects.create(visitante="x" * 64, datos={"estilo": "y2k"})
        from finanzas.models import CargoCredito, ConfiguracionFinanzas

        CargoCredito.objects.create(
            credito=Credito.objects.get(), fecha=date(2026, 9, 2), valor=1
        )
        GastoFijo.objects.create(
            nombre="Mama", monto=400_000, fecha_inicio=date(2026, 9, 1)
        )
        ConfiguracionFinanzas.objects.create(salario=2_872_000)
        r = APIClient(HTTP_HOST="localhost").get("/api/finanzas/exportar/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("attachment", r["Content-Disposition"])
        modelos = {fila["model"] for fila in json.loads(r.content)}
        self.assertEqual(
            modelos,
            {
                "finanzas.movimiento",
                "finanzas.credito",
                "finanzas.sugerencia",
                "finanzas.cargocredito",
                "finanzas.gastofijo",
                "finanzas.configuracionfinanzas",
            },
        )


class AsesorCreditosTests(TestCase):
    def test_contexto_trae_tasa_intereses_y_plazo(self):
        from finanzas.contexto import creditos_como_texto

        Credito.objects.create(
            nombre="Solventa",
            saldo_inicial=1_000_000,
            fecha_inicio=date(2026, 9, 1),
            tasa_ea=Decimal("26.82"),
            cuota=100_000,
        )
        Credito.objects.create(
            nombre="Nu", saldo_inicial=1_000_000, fecha_inicio=date(2026, 9, 1),
            tasa_ea=Decimal("40"), cuota=5_000,
        )
        texto = creditos_como_texto()
        self.assertIn("26.82 % E.A. (2.00 % mensual)", texto)
        self.assertIn("termina en unos 12 meses", texto)
        self.assertIn("NO baja", texto)

    def test_el_chat_de_creditos_usa_su_asesor(self):
        from chat.models import Conversation
        from chat.services import SIN_CREDITOS, SISTEMA_CREDITOS, sistema_para

        conversacion = Conversation(visitor="x", scope=Conversation.Scope.CREDITOS)
        self.assertEqual(sistema_para(conversacion), SIN_CREDITOS)
        Credito.objects.create(
            nombre="Addi", saldo_inicial=300_000, fecha_inicio=date(2026, 9, 1)
        )
        sistema = sistema_para(conversacion)
        self.assertTrue(sistema.startswith(SISTEMA_CREDITOS))
        self.assertIn("Addi: saldo $ 300.000", sistema)
        self.assertIn("tasa desconocida", sistema)


class CargosTests(TestCase):
    def test_intereses_suben_el_saldo_sin_tocar_las_finanzas(self):
        cliente = APIClient(HTTP_HOST="localhost")
        credito = Credito.objects.create(
            nombre="Nu", saldo_inicial=8_000_000, fecha_inicio=date(2026, 10, 1)
        )
        anotar("2026-10-01", "gasto", "Nu", 824_000)
        anotar("2026-10-01", "ingreso", "Nu", 680_000)
        r = cliente.post(
            f"/api/finanzas/creditos/{credito.pk}/cargos/",
            {"fecha": "2026-10-01", "tipo": "intereses", "valor": 140_000},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        (datos,) = cliente.get("/api/finanzas/creditos/").json()
        self.assertEqual(datos["total_cargos"], 140_000)
        self.assertEqual(datos["saldo"], 7_996_000)
        self.assertEqual(datos["cargos"][0]["tipo"], "intereses")
        # Los cargos no son movimientos: el balance del mes no cambia.
        self.assertEqual(Movimiento.objects.count(), 2)

        cliente.delete(f"/api/finanzas/cargos/{datos['cargos'][0]['id']}/")
        (datos,) = cliente.get("/api/finanzas/creditos/").json()
        self.assertEqual(datos["saldo"], 7_856_000)


class GastosFijosTests(TestCase):
    def setUp(self):
        self.cliente = APIClient(HTTP_HOST="localhost")

    def crear(self):
        r = self.cliente.post(
            "/api/finanzas/gastos-fijos/",
            {"nombre": "Mama", "monto": 400_000, "fecha_inicio": "2026-08-01"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)

    def test_se_llena_con_pagos_y_suma_prestamos(self):
        from finanzas import fijos

        self.crear()
        anotar("2026-08-02", "gasto", "Mama", 400_000)  # agosto: pagado
        anotar("2026-09-02", "gasto", "Mama", 300_000)  # septiembre: faltan 100
        anotar("2026-10-03", "ingreso", "Mama", 50_000)  # octubre: le presta
        anotar("2026-10-05", "gasto", "Mama", 200_000)
        estado = fijos.estado(GastoFijo.objects.get(), date(2026, 10, 10))
        agosto, septiembre, octubre = estado["historial"]
        self.assertEqual(agosto["pendiente"], 0)
        self.assertEqual(septiembre["pendiente"], 100_000)
        # Octubre: 100 que venían + 400 del mes + 50 prestados − 200 pagados.
        self.assertEqual(octubre["arrastre"], 100_000)
        self.assertEqual(octubre["total"], 550_000)
        self.assertEqual(octubre["pendiente"], 350_000)
        self.assertEqual(estado["estado"], "parcial")

        anotar("2026-10-20", "gasto", "Mama", 350_000)
        estado = fijos.estado(GastoFijo.objects.get(), date(2026, 10, 25))
        self.assertEqual(estado["estado"], "pagado")

    def test_no_puede_ser_credito_y_fijo(self):
        Credito.objects.create(
            nombre="Mama", saldo_inicial=1, fecha_inicio=date(2026, 9, 1)
        )
        r = self.cliente.post(
            "/api/finanzas/gastos-fijos/",
            {"nombre": "mama", "monto": 400_000, "fecha_inicio": "2026-09-01"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)


class CostoPorPagoTests(TestCase):
    def test_solo_el_capital_baja_la_deuda(self):
        # Mt15: de 645.995, 231.103 van a capital (64,22 % es costo).
        Credito.objects.create(
            nombre="Mt15",
            saldo_inicial=10_000_000,
            fecha_inicio=date(2026, 10, 1),
            costo_pct=Decimal("64.22"),
        )
        anotar("2026-10-05", "gasto", "Mt15", 645_995)
        (datos,) = APIClient(HTTP_HOST="localhost").get("/api/finanzas/creditos/").json()
        self.assertEqual(datos["abonado"], 645_995)
        self.assertEqual(datos["costos_en_pagos"], round(645_995 * 0.6422))
        self.assertEqual(datos["capital_abonado"], 645_995 - round(645_995 * 0.6422))
        self.assertEqual(datos["saldo"], 10_000_000 - datos["capital_abonado"])


class DuracionYProximosTests(TestCase):
    def fijo(self, **datos):
        return GastoFijo.objects.create(nombre="Mama", monto=400_000, **datos)

    def test_lo_pagado_de_mas_no_pasa_al_otro_mes(self):
        from finanzas import fijos

        fijo = self.fijo(fecha_inicio=date(2026, 9, 1))
        anotar("2026-09-02", "gasto", "Mama", 539_000)
        estado = fijos.estado(fijo, date(2026, 10, 3))
        septiembre, octubre = estado["historial"]
        self.assertEqual(septiembre["pendiente"], -139_000)
        self.assertEqual(octubre["arrastre"], 0)
        self.assertEqual(estado["pendiente_mes"], 400_000)

    def test_una_sola_vez_y_programado(self):
        from finanzas import fijos

        amigo = GastoFijo.objects.create(
            nombre="Amigo",
            monto=300_000,
            fecha_inicio=date(2026, 11, 1),
            fecha_fin=date(2026, 11, 1),
        )
        estado = fijos.estado(amigo, date(2026, 10, 15))
        self.assertEqual(estado["estado"], "programado")
        self.assertEqual(estado["siguiente"], 300_000)
        # En noviembre se debe; en diciembre ya no, si se pagó.
        anotar("2026-11-20", "gasto", "Amigo", 300_000)
        estado = fijos.estado(amigo, date(2026, 12, 2))
        self.assertEqual(estado["estado"], "terminado")
        self.assertIsNone(estado["proximo"])

    def test_proximo_pago_del_credito(self):
        from django.utils import timezone

        hoy = timezone.localdate()
        Credito.objects.create(
            nombre="Nu", saldo_inicial=5_000_000, fecha_inicio=hoy.replace(day=1),
            cuota=821_000,
        )
        cliente = APIClient(HTTP_HOST="localhost")
        (nu,) = cliente.get("/api/finanzas/creditos/").json()
        self.assertEqual(nu["pendiente_mes"], 821_000)
        self.assertEqual(nu["proximo"]["mes"], f"{hoy:%Y-%m}")
        anotar(f"{hoy.replace(day=1)}", "gasto", "Nu", 821_000)
        (nu,) = cliente.get("/api/finanzas/creditos/").json()
        self.assertEqual(nu["pendiente_mes"], 0)
        self.assertNotEqual(nu["proximo"]["mes"], f"{hoy:%Y-%m}")
        self.assertEqual(nu["siguiente"], 821_000)

    def test_salario(self):
        cliente = APIClient(HTTP_HOST="localhost")
        self.assertIsNone(cliente.get("/api/finanzas/configuracion/").json()["salario"])
        cliente.put("/api/finanzas/configuracion/", {"salario": 2_872_000}, format="json")
        self.assertEqual(
            cliente.get("/api/finanzas/configuracion/").json()["salario"], 2_872_000
        )


class AsesorFlexibleTests(TestCase):
    def test_trae_promedios_y_gastos_hormiga(self):
        from django.utils import timezone

        from finanzas.calculos import mes_anterior, primer_dia
        from finanzas.contexto import creditos_como_texto

        pasado = mes_anterior(primer_dia(timezone.localdate()))
        anotar(f"{pasado}", "ingreso", "Sueldo", 2_872_000)
        for dia in range(1, 11):
            anotar(f"{pasado.replace(day=dia)}", "gasto", "Cigarrillos", 5_000)
        texto = creditos_como_texto()
        self.assertIn("Cigarrillos: $ 50.000 al mes, 10 veces al mes", texto)
        self.assertIn("Gastos hormiga", texto)
        self.assertIn("libre $ 2.822.000 al mes", texto)
