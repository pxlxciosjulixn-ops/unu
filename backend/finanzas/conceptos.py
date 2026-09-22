"""
Conceptos fijos y cómo se homogenizan.

"mt15", "MT15 " y "Mt15" son el mismo concepto: si lo escrito coincide con uno
de la lista (sin importar mayúsculas, tildes ni espacios de sobra), se guarda
con el nombre de la lista. Así el dashboard y el asistente los suman juntos y
el filtro por concepto trae todo el dinero de ese concepto.

La misma lista vive en `frontend/src/components/finanzas/finanzas.ts`
(`CONCEPTOS_FIJOS`) para las sugerencias del formulario. Si se cambia una, se
cambia la otra; si no, la de aquí manda, porque es la que se guarda.
"""

from __future__ import annotations

import unicodedata

CONCEPTOS_FIJOS = [
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


_POR_CLAVE = {clave(nombre): nombre for nombre in CONCEPTOS_FIJOS}


def homogenizar(texto: str) -> str:
    """El nombre de la lista si coincide; si no, lo escrito sin espacios de sobra."""
    limpio = " ".join(texto.split())
    return _POR_CLAVE.get(clave(limpio), limpio)
