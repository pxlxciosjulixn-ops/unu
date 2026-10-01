from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from finanzas import analisis
from finanzas.models import AjusteVisual, Movimiento, Sugerencia


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
