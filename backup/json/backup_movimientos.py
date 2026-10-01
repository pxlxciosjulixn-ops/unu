"""
Backup de todo lo de finanzas en JSON: movimientos (gastos e ingresos),
créditos, sugerencias de concepto (con su grupo y presupuesto), avisos de
correo ya enviados y ajustes de diseño.

Uso, desde cualquier carpeta:

    python backup_movimientos.py

Crea `finanzas-AAAAMMDD-HHMMSS.json` junto a este script y, cuando ya
quedó escrito, borra los backups anteriores de esta carpeta (también los
viejos `movimientos-*.json`, que solo traían los movimientos): siempre queda
solo el más reciente. Lee la base que diga `backend/.env` (`DATABASE_URL`: la
de Render si está puesta; si no, el SQLite local). Solo lee: no cambia nada en
la base.

El contenido lo arma `backend/finanzas/respaldo.py`, el mismo que usa el botón
"Exportar JSON" del dashboard. Sale en el formato de Django, así que se
restaura con:

    cd backend
    python manage.py loaddata ../backup/json/finanzas-AAAAMMDD-HHMMSS.json

Ojo: `loaddata` escribe con los mismos `id`, así que reemplaza lo que ya
exista con ese id y agrega lo que falte.
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
BACKEND = CARPETA.parent.parent / "backend"
PYTHON_VENV = BACKEND / "env" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")

# Los backups de antes (solo movimientos) y los de ahora: de todos queda uno.
PATRONES = ["finanzas-*.json", "movimientos-*.json"]


def usar_el_python_del_backend() -> None:
    """
    Corre el script con el Python del entorno virtual del backend, que es el
    que tiene todas sus dependencias (Django solo no alcanza: el proyecto
    también necesita DRF, psycopg, etc.).
    """
    if not PYTHON_VENV.exists():
        return  # Sin venv: se intenta con este Python y, si falta algo, se avisa.
    if Path(sys.executable).resolve() == PYTHON_VENV.resolve():
        return
    entorno = {**os.environ, "PYTHONUTF8": "1"}
    sys.exit(subprocess.call([str(PYTHON_VENV), __file__, *sys.argv[1:]], env=entorno))


def main() -> None:
    usar_el_python_del_backend()

    # `settings.py` lee `backend/.env` por su cuenta.
    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    try:
        import django
        from django.db import connection

        django.setup()
    except ImportError as exc:
        sys.exit(
            f"Falta una dependencia del backend ({exc.name}). Crea el entorno "
            f"virtual en {PYTHON_VENV.parent.parent} e instala backend/requirements.txt."
        )

    from finanzas import respaldo

    base = connection.settings_dict
    donde = base.get("HOST") or base.get("NAME")
    print(f"Base: {connection.vendor} ({donde})")

    anteriores = sorted(p for patron in PATRONES for p in CARPETA.glob(patron))
    destino = CARPETA / f"finanzas-{datetime.now():%Y%m%d-%H%M%S}.json"
    # Se escribe primero en un temporal y se renombra al final: si algo falla
    # a mitad, no queda un JSON cortado y los backups anteriores siguen ahí.
    temporal = destino.with_suffix(".json.tmp")
    # UTF-8 explícito: con la codificación de Windows (cp1252) fallaría con
    # emojis u otros caracteres raros en los conceptos.
    with temporal.open("w", encoding="utf-8") as archivo:
        cuantos = respaldo.escribir(archivo)
    temporal.replace(destino)

    print(f"Guardado en {destino}")
    for nombre, total in cuantos.items():
        print(f"  {nombre}: {total}")

    # Solo se guarda el último: con el nuevo ya escrito, se borran los viejos.
    for viejo in anteriores:
        if viejo != destino:
            viejo.unlink()
            print(f"Borrado el backup anterior: {viejo.name}")


if __name__ == "__main__":
    main()
