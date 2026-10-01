"""
Respaldo de todo lo de finanzas en JSON, en el formato de Django.

Lo usan el script `backup/json/backup_movimientos.py` y el botón "Exportar
JSON" del dashboard, así que los dos archivos salen iguales y se restauran
igual:

    cd backend
    python manage.py loaddata ../ruta/finanzas-AAAAMMDD-HHMMSS.json

`loaddata` escribe con los mismos `id`: reemplaza lo que ya exista con ese id
y agrega lo que falte.
"""

from __future__ import annotations

from itertools import chain
from typing import IO

from django.core import serializers
from django.utils import timezone

from finanzas.models import AjusteVisual, AvisoEnviado, Credito, Movimiento, Sugerencia


def consultas(con_ajustes: bool = True) -> dict[str, object]:
    """
    Qué entra al respaldo, en el orden en que se restaura.

    Los ajustes de diseño van atados al hash de la IP de cada quien: el script
    los guarda, pero el botón público no los reparte.
    """
    partes = {
        "sugerencias": Sugerencia.objects.order_by("id"),
        "creditos": Credito.objects.order_by("id"),
        "movimientos": Movimiento.objects.order_by("fecha", "id"),
        "avisos": AvisoEnviado.objects.order_by("id"),
    }
    if con_ajustes:
        partes["ajustes"] = AjusteVisual.objects.order_by("id")
    return partes


def escribir(stream: IO[str], con_ajustes: bool = True) -> dict[str, int]:
    """Escribe el respaldo en `stream` y devuelve cuántas filas van de cada cosa."""
    partes = consultas(con_ajustes)
    serializers.serialize(
        "json",
        chain.from_iterable(partes.values()),
        stream=stream,
        indent=2,
        # UTF-8 tal cual: tildes y emojis en los conceptos se leen en el archivo.
        ensure_ascii=False,
    )
    return {nombre: consulta.count() for nombre, consulta in partes.items()}


def nombre_archivo() -> str:
    return f"finanzas-{timezone.localtime():%Y%m%d-%H%M%S}.json"
