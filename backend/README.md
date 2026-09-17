# unu — backend

Esqueleto de API con Django 6.1 + Django REST Framework, conectado a PostgreSQL.

## Estructura

```
backend/
  config/          # proyecto Django (settings, urls, wsgi, asgi)
  core/            # app transversal: health check y chat con el modelo
  dashboard/       # modelos, endpoints y datos de prueba del tablero
  Dockerfile           # imagen para Render
  docker-entrypoint.sh # migra y arranca gunicorn
  render.yaml          # configuracion del servicio, como referencia
  env/             # entorno virtual (ignorado por git)
  .env             # secretos reales (ignorado por git)
  .env.example     # plantilla de variables
  manage.py
  requirements.txt
```

## Puesta en marcha

```bash
cd backend

# 1. Entorno virtual (ya creado; recrearlo solo si hace falta)
python -m venv env

# 2. Dependencias
env/Scripts/python.exe -m pip install -r requirements.txt

# 3. Variables de entorno
cp .env.example .env   # y rellenar los valores

# 4. Migraciones
env/Scripts/python.exe manage.py migrate

# 5. Servidor
env/Scripts/python.exe manage.py runserver
```

En Linux/macOS los comandos son `env/bin/python` en vez de `env/Scripts/python.exe`.

## Endpoints

| Método | Ruta                             | Descripción                                    |
| ------ | -------------------------------- | ---------------------------------------------- |
| GET    | `/api/health/`                   | Estado del servicio y de la base de datos      |
| POST   | `/api/chat/`                     | Conversación con el modelo, en streaming (SSE) |
| GET    | `/api/dashboard/overview/`       | Todo el tablero en una sola llamada            |
| GET    | `/api/dashboard/summary/`        | Indicadores del mes contra el mes anterior     |
| GET    | `/api/dashboard/sales-series/`   | Meta, venta real y cumplimiento por mes        |
| GET    | `/api/dashboard/filters/`        | Opciones de los selectores del tablero         |
| GET    | `/api/dashboard/profit/`         | Ingresos, gastos, utilidad y margen            |
| GET    | `/api/dashboard/countries/`      | Ventas por país del cliente (`?limit=6`)       |
| GET    | `/api/dashboard/orders/recent/`  | Últimos pedidos (`?limit=8`)                   |
| GET    | `/api/dashboard/products/`       | Catálogo con unidades e ingresos, paginado     |
| —      | `/admin/`                        | Admin de Django                                |

### Filtros

Todos los endpoints del tablero aceptan:

| Parámetro       | Valores                                  | Efecto                                                     |
| --------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `month`         | `AAAA-MM`                                | Mes analizado. Sin él, el último mes con pedidos           |
| `months`        | 3 a 36 (por defecto 12)                  | Ventana de las series y del desglose por país              |
| `country`       | ISO de dos letras (`CO`, `MX`, …)        | Filtra por país del cliente                                |
| `order_status`  | `paid`, `pending`, `refunded`, `failed`  | Solo aplica a `/orders/recent/`                            |

`/api/dashboard/products/` acepta además `?search=`,
`?status=active|low_stock|out_of_stock`, `?ordering=` (`revenue`, `units_sold`,
`name`, `price`, con `-` para descendente) y `?page=`. El estado del producto se
llama `status` y el del pedido `order_status` a propósito, para que el tablero
pueda mandar los dos en la misma URL.

Las metas (`MonthlyTarget`) son del negocio completo. Cuando se filtra por país,
`sales-series` y `summary` devuelven `targets_available: false` y omiten el
cumplimiento en vez de repartir una meta que no existe por país. La utilidad
también queda global, porque los gastos no están abiertos por país.

**Rendimiento:** `/overview/` responde en ~3 s contra la base de Render en
Oregón; son unas diez consultas y cada viaje cuesta ~250 ms. Las agregaciones
por mes van agrupadas en una sola consulta y el "último mes con pedidos" se
guarda en la petición para no repetirlo en cada sub-vista.

`/api/health/` devuelve `200` si la base responde y `503` si no:

```json
{
  "status": "ok",
  "debug": true,
  "django": "6.1",
  "database": { "connected": true, "engine": "postgresql", "name": "unu" },
  "integrations": { "nvidia": { "configured": true, "model": "deepseek-ai/..." } }
}
```

De las integraciones solo informa si la key **está configurada**, nunca su valor.

## Chat con el modelo

`POST /api/chat/` recibe la conversación y devuelve la respuesta en trozos:

```json
{ "messages": [{ "role": "user", "content": "Hola" }] }
```

La respuesta es un flujo `text/event-stream` con cuatro tipos de evento:
`start` (trae el nombre del modelo), `delta` (un trozo de texto), `done` y
`error` (con un mensaje ya listo para mostrar).

- La `NVIDIA_API_KEY` **nunca sale del servidor**: el navegador solo habla con
  este endpoint.
- Va en streaming porque el modelo tarda entre 15 y 30 segundos en soltar la
  primera palabra; es cola del proveedor, no del servidor.
- El modo de razonamiento va **apagado** (`chat_template_kwargs.thinking =
  false`): agregaba unos 10 segundos mas de espera sin mejorar la respuesta.
- Limite de 20 peticiones por minuto y por IP (`DEFAULT_THROTTLE_RATES`), para
  que un endpoint publico no consuma la cuota de NVIDIA.
- Se envian como maximo los ultimos 20 mensajes y 24.000 caracteres.

## Datos de prueba del dashboard

```bash
env/Scripts/python.exe manage.py migrate
env/Scripts/python.exe manage.py seed_dashboard --reset
```

`seed_dashboard` usa una semilla fija, así que siempre genera los mismos
números: 26 productos, 220 clientes y unos 2.300 pedidos repartidos en 14 meses,
más gastos, metas de venta y tráfico diario. Son datos inventados para probar la
interfaz; `--reset` borra los anteriores antes de crear los nuevos. Opciones:
`--months` y `--orders-per-month`.

## Variables de entorno

| Variable               | Obligatoria      | Notas                                                      |
| ---------------------- | ---------------- | ---------------------------------------------------------- |
| `DJANGO_SECRET_KEY`    | sí en producción | Con `DEBUG=False` el proyecto se niega a arrancar sin ella |
| `DJANGO_DEBUG`         | no               | `True`/`False`. Por defecto `False`                        |
| `DJANGO_ALLOWED_HOSTS` | no               | Separados por comas                                        |
| `CORS_ALLOWED_ORIGINS` | no               | Orígenes del frontend, separados por comas                 |
| `DATABASE_URL`         | no               | Si está vacía se usa SQLite local                          |
| `NVIDIA_API_KEY`       | no               | Para la integración con NVIDIA NIM / DeepSeek              |
| `NVIDIA_BASE_URL`      | no               | Por defecto `https://integrate.api.nvidia.com/v1`          |
| `NVIDIA_MODEL`         | no               | Por defecto `deepseek-ai/deepseek-v4-flash-0731`           |

## Base de datos

Se usa `DATABASE_URL` (formato de `dj-database-url`), con reuso de conexiones
durante 10 minutos porque la base es remota.

Render da dos hosts para el mismo PostgreSQL:

- **Externo** (`...oregon-postgres.render.com`) — desde tu máquina. Exige
  `?sslmode=require`. Es el que está configurado ahora.
- **Interno** (`dpg-...-a`, sin dominio) — solo funciona entre servicios dentro
  de Render. Más rápido y no sale a internet. Cambia a este cuando despliegues
  el backend en Render.

## Despliegue en Render (Docker)

La imagen se construye con `backend/Dockerfile`: instala las dependencias,
genera los estaticos con `collectstatic`, corre como usuario sin privilegios y
arranca gunicorn. Antes de servir, `docker-entrypoint.sh` aplica las
migraciones.

### Pasos en el panel

1. **New > Web Service**, conecta el repo y elige **Docker** como runtime.
2. **Root Directory:** `backend` (el repo tiene `frontend/` y `backend/`).
3. **Health Check Path:** `/api/health/`.
4. Variables de entorno:

   | Variable               | Valor                                                             |
   | ---------------------- | ----------------------------------------------------------------- |
   | `DJANGO_DEBUG`         | `False`                                                           |
   | `DJANGO_SECRET_KEY`    | Generala con el boton *Generate* de Render                        |
   | `DATABASE_URL`         | URL **interna** de la base (`dpg-...-a`, sin dominio)             |
   | `CORS_ALLOWED_ORIGINS` | La URL del frontend ya desplegado, ej. `https://algo.onrender.com` |
   | `NVIDIA_API_KEY`       | Tu key (solo aqui, nunca en el repo)                              |
   | `NVIDIA_MODEL`         | `deepseek-ai/deepseek-v4-flash-0731`                              |
   | `WEB_CONCURRENCY`      | `2`                                                               |
   | `GUNICORN_THREADS`     | `8`                                                               |

   `PORT` y `RENDER_EXTERNAL_HOSTNAME` las pone Render; el proyecto ya las usa.

5. En el **frontend**, define `VITE_API_URL` con la URL del backend y vuelve a
   desplegar: ese valor se incrusta al compilar, no se lee en tiempo de
   ejecucion.

`backend/render.yaml` tiene la misma configuracion como referencia.

### Cosas que conviene tener en cuenta

- **Base de datos:** usa el host interno. El externo
  (`...oregon-postgres.render.com`) sale a internet y es mas lento; el interno
  solo funciona entre servicios de Render.
- **Datos del dashboard:** ya estan sembrados en esa base, asi que no hay que
  volver a correr `seed_dashboard`. Si algun dia hace falta, se puede activar
  `SEED_DASHBOARD=1` un arranque (borra y vuelve a crear) o correr el comando
  en local, que apunta a la misma base.
- **Plan gratis:** el servicio se duerme sin trafico y el primer arranque tarda
  cerca de un minuto. Sumado a los 15-30 s que tarda DeepSeek, la primera
  respuesta del chat puede irse a mas de un minuto.
- **Streaming:** gunicorn corre con hilos (`gthread`) y timeout de 300 s, y el
  endpoint manda `X-Accel-Buffering: no`, para que el proxy no acumule la
  respuesta del chat.
- **El health check no redirige:** con `DEBUG=False` todo va a HTTPS, pero
  `/api/health/` queda exento porque Render lo consulta por HTTP interno.

## Notas de seguridad

- `.env` y `env/` están en `.gitignore`. Verificado: no se suben.
- Con `DEBUG=False` se activan `SECURE_SSL_REDIRECT`, cookies seguras y
  `SECURE_PROXY_SSL_HEADER` (necesario detrás del proxy de Render).
- DRF está en `AllowAny` por defecto: **hay que endurecerlo** antes de exponer
  endpoints que escriban datos.
- El límite de 20 peticiones por minuto del chat se cuenta en la memoria de
  cada proceso de gunicorn: con `WEB_CONCURRENCY=2` el tope real es el doble.
  Para un límite exacto habría que configurar un cache compartido (Redis).
