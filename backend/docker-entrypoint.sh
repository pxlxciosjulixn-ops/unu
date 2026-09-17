#!/bin/sh
# Arranque del contenedor: migra y entrega el control a gunicorn.
set -e

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "==> Aplicando migraciones"
  python manage.py migrate --noinput
else
  echo "==> RUN_MIGRATIONS=0: se omiten las migraciones"
fi

# Datos de prueba del dashboard. Apagado por defecto: con --reset borra lo que
# haya. Se activa a proposito una sola vez y despues se vuelve a apagar.
if [ "${SEED_DASHBOARD:-0}" = "1" ]; then
  echo "==> Sembrando datos de prueba del dashboard"
  python manage.py seed_dashboard --reset
fi

echo "==> Iniciando servidor"
exec "$@"
