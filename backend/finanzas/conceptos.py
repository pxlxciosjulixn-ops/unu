"""
Conceptos sugeridos y cómo se homogenizan.

"mt15", "MT15 " y "Mt15" son el mismo concepto: si lo escrito coincide con una
sugerencia guardada (sin importar mayúsculas, tildes ni espacios de sobra), se
guarda con el nombre de la sugerencia. Así el dashboard y el asistente los
suman juntos y el filtro por concepto trae todo el dinero de ese concepto.

Las sugerencias viven en la tabla `finanzas_sugerencia` y se administran desde
la página de edición (`/editar/gastos/julian/palacios`). `CONCEPTOS_SEMILLA`
es solo con lo que arrancó esa tabla en la migración 0004: de ahí en adelante
manda la tabla, y esta lista únicamente sirve de respaldo si todavía no se ha
migrado.
"""

from __future__ import annotations

import unicodedata

from django.db import DatabaseError

CONCEPTOS_SEMILLA = [
    "Mt15",
    "Nu",
    "Addi",
    "Comida",
    "Comida gatos",
    "Prestamo",
    "Abuelos",
    "Pago deuda",
    "Gasolina",
    "Mama",
]


def clave(texto: str) -> str:
    """Forma de comparar: sin tildes, en minúsculas y con espacios simples."""
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    return " ".join(sin_tildes.lower().split())


def mapa() -> dict[str, str]:
    """
    Clave → nombre de cada sugerencia guardada.

    Es una consulta por llamada, así que quien homogenice varios conceptos
    seguidos (el resumen del correo) lo pide una vez y lo pasa.
    """
    try:
        from finanzas.models import Sugerencia

        return {s.clave: s.nombre for s in Sugerencia.objects.only("clave", "nombre")}
    except DatabaseError:
        # La tabla todavía no existe: pasa dentro de las migraciones viejas,
        # que corren antes de que la 0004 la cree.
        return {clave(nombre): nombre for nombre in CONCEPTOS_SEMILLA}


def nombre_sugerido(texto: str, sugerencias: dict[str, str] | None = None) -> str | None:
    """El nombre de la sugerencia que coincide con lo escrito, o `None`."""
    if sugerencias is None:
        sugerencias = mapa()
    return sugerencias.get(clave(texto))


def homogenizar(texto: str, sugerencias: dict[str, str] | None = None) -> str:
    """El nombre de la sugerencia si coincide; si no, lo escrito sin espacios de sobra."""
    limpio = " ".join(texto.split())
    return nombre_sugerido(limpio, sugerencias) or limpio
