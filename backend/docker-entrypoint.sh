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

# Hoja de vida. Encendido por defecto porque no pisa nada: solo escribe si la
# base esta vacia, asi el CV existe desde el primer despliegue y lo que se
# edite despues desde el sitio se queda como esta.
if [ "${SEED_RESUME:-1}" = "1" ]; then
  echo "==> Verificando la hoja de vida"
  python manage.py seed_resume
fi

echo "==> Iniciando servidor"
exec "$@"
