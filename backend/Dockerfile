# Imagen del backend de `unu` para Render (runtime Docker).
#
# Construir y probar en local:
#   docker build -t unu-backend ./backend
#   docker run --rm -p 8000:8000 -e PORT=8000 --env-file ./backend/.env \
#     -e DJANGO_DEBUG=False -e DJANGO_SECRET_KEY=algo-largo-y-aleatorio unu-backend
FROM python:3.13-slim

# - PYTHONUNBUFFERED: los logs salen de una en los registros de Render.
# - PIP_NO_CACHE_DIR: imagen mas liviana.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=10000

WORKDIR /app

# Las dependencias van primero: la capa se reaprovecha mientras
# requirements.txt no cambie. `psycopg-binary` trae el driver compilado, asi
# que no hace falta instalar compiladores ni libpq-dev.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# El script se copia desde Windows: se le quitan los retornos de carro y se le
# da permiso de ejecucion, porque si no el contenedor falla con "not found".
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && chmod +x /app/docker-entrypoint.sh

# `collectstatic` importa settings, y con DEBUG=False settings exige
# DJANGO_SECRET_KEY. Aqui se usa una de mentira que solo vive en este paso:
# no queda en la imagen ni se usa en tiempo de ejecucion.
RUN DJANGO_DEBUG=True DJANGO_SECRET_KEY=solo-para-construir-estaticos \
    python manage.py collectstatic --noinput

# Usuario sin privilegios.
RUN useradd --create-home --uid 10001 django \
    && chown -R django:django /app
USER django

EXPOSE 10000

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Notas de gunicorn:
# - `gthread` con varios hilos: el endpoint de chat mantiene la conexion
#   abierta mientras el modelo responde, y con workers `sync` cada respuesta
#   bloquearia un proceso completo.
# - `--timeout 300`: esa espera puede pasar del minuto; el timeout por defecto
#   (30 s) cortaria la respuesta a medias.
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers ${WEB_CONCURRENCY:-2} --worker-class gthread --threads ${GUNICORN_THREADS:-8} --timeout ${GUNICORN_TIMEOUT:-300} --graceful-timeout 30 --keep-alive 5 --access-logfile - --error-logfile -"]
