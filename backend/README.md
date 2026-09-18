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
| POST   | `/api/auth/login/`               | Usuario y contraseña → tokens JWT              |
| POST   | `/api/auth/refresh/`             | Refresco → acceso nuevo                        |
| POST   | `/api/auth/logout/`              | Invalida el refresco                           |
| GET    | `/api/auth/me/`                  | Datos del dueño del token (exige sesión)       |
| POST   | `/api/chat/`                     | Conversación con el modelo, en streaming (SSE) |
| GET    | `/api/chat/conversations/`       | Historial del visitante                        |
| GET    | `/api/chat/conversations/<id>/`  | Mensajes de una conversación                   |
| DELETE | `/api/chat/conversations/<id>/`  | Borra una conversación                         |
| DELETE | `/api/chat/conversations/clear/` | Borra todo el historial del visitante          |
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
  "integrations": { "nvidia": { "configured": true, "model": "moonshotai/kimi-k3" } }
}
```

De las integraciones solo informa si la key **está configurada**, nunca su valor.

## Autenticacion (JWT)

El login devuelve dos tokens: **acceso** (60 min por defecto) que acompaña a
cada peticion en `Authorization: Bearer ...`, y **refresco** (7 dias) que sirve
para pedir un acceso nuevo sin volver a escribir la contraseña.

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/   -H "Content-Type: application/json"   -d '{"username": "tu-usuario", "password": "tu-clave"}'
```

Responde `{"access": "...", "refresh": "...", "user": {...}}`.

- **La rotacion esta activada**: cada refresco entrega uno nuevo y deja el
  anterior en la lista negra (`token_blacklist`), asi que un refresco robado
  deja de servir en cuanto el dueño lo usa.
- **`/api/auth/logout/`** mete el refresco en la lista negra. El acceso sigue
  vivo hasta que expire, por eso se emite corto.
- Los tokens se firman con `DJANGO_SECRET_KEY`: si cambia, todas las sesiones
  caducan.
- Duraciones ajustables con `JWT_ACCESS_MINUTES` y `JWT_REFRESH_DAYS`.
- Limite de 10 intentos por minuto y por IP contra el login.

### Crear un usuario

```bash
env/Scripts/python.exe manage.py createsuperuser
```

En el frontend, `/login` pide las credenciales y `/home` es la pagina protegida
("HOME DEL LOGIN"): si el token no sirve, devuelve al login.

## Chat con el modelo

`POST /api/chat/` recibe un mensaje y devuelve la respuesta en trozos:

```json
{ "message": "Hola", "conversation_id": "uuid opcional" }
```

Sin `conversation_id` se crea una conversación nueva y su identificador llega
en el evento `start`. El historial lo arma el servidor leyendo la base, no el
navegador.

La respuesta es un flujo `text/event-stream` con cuatro tipos de evento:
`start` (trae el nombre del modelo), `delta` (un trozo de texto), `done` y
`error` (con un mensaje ya listo para mostrar).

- La `NVIDIA_API_KEY` **nunca sale del servidor**: el navegador solo habla con
  este endpoint.
- Va en streaming porque la espera depende del proveedor. Medido con el mismo
  codigo: **OpenAI (`gpt-4o-mini`) responde completo en unos 5 segundos**,
  mientras el endpoint gratis de NVIDIA tardo entre 15 y 30 segundos en un dia
  normal y mas de 100 con la cola cargada (un "hola" tarda lo mismo que una
  pregunta larga). OpenAI cobra por token; NVIDIA es gratis pero se encola.
- **Cambiar de proveedor es cambiar `CHAT_PROVIDER`** (`openai` o `nvidia`) y
  el modelo, su variable correspondiente. Los dos hablan el dialecto de OpenAI,
  asi que el codigo del streaming es el mismo; lo resuelve
  `chat.services.proveedor_activo()`.
- Cada familia de modelos nombra distinto lo del razonamiento, y de eso se
  encarga `Proveedor.extras()`:
  - Kimi: `reasoning_effort` (`low`, `high`, `max`). Se manda `low`.
  - DeepSeek: `chat_template_kwargs.thinking`, que se apaga.

  Un modelo que no reconozca el parametro lo ignora, asi que el peor caso es
  quedarse con su comportamiento por defecto.
- Cuando el modelo razona, el servidor manda un evento `thinking` en cuanto
  llegan los primeros tokens de razonamiento. El razonamiento en si no se
  muestra (es ruido), pero la pagina cambia el aviso a "Razonando…" para que se
  vea que ya esta trabajando.
- Limite de 20 peticiones por minuto y por IP (`DEFAULT_THROTTLE_RATES`), para
  que un endpoint publico no consuma la cuota de NVIDIA.
- Se envian como maximo los ultimos 20 mensajes y 24.000 caracteres.

### Historial y privacidad

Las conversaciones y sus mensajes quedan guardados (app `chat`). Como no hay
inicio de sesion, se agrupan por visitante usando su IP, que llega en
`X-Forwarded-For` detras del proxy de Render.

**En la base no se guarda la IP en claro**, sino un SHA-256 con la
`DJANGO_SECRET_KEY` como sal. Sirve igual para reconocer al mismo visitante y
evita almacenar un dato personal que nadie va a leer a mano. Dos consecuencias
que conviene tener presentes:

- Si cambia la `DJANGO_SECRET_KEY`, los visitantes dejan de ver su historial
  anterior (el hash cambia).
- Varias personas detras de la misma IP (una oficina, una red movil) comparten
  historial. Para separarlas haria falta inicio de sesion o una cookie.

La respuesta del modelo se guarda tambien si el visitante cierra la pestaña a
mitad: lo que alcanzo a llegar queda registrado.

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
| `NVIDIA_API_KEY`       | si con nvidia    | Llave de NVIDIA NIM                                        |
| `JWT_ACCESS_MINUTES`   | no               | Vida del token de acceso. Por defecto 60                   |
| `JWT_REFRESH_DAYS`     | no               | Vida del token de refresco. Por defecto 7                  |
| `NVIDIA_BASE_URL`      | no               | Por defecto `https://integrate.api.nvidia.com/v1`          |
| `CHAT_PROVIDER`        | no               | `openai` (por defecto) o `nvidia`                          |
| `OPENAI_API_KEY`       | si con openai    | Llave de OpenAI                                            |
| `OPENAI_API_BASE`      | no               | Por defecto `https://api.openai.com/v1`                    |
| `OPENAI_DEFAULT_MODEL` | no               | Por defecto `gpt-4o-mini`                                  |
| `NVIDIA_MODEL`         | no               | Por defecto `moonshotai/kimi-k3`                           |
| `NVIDIA_MAX_TOKENS`    | no               | Tope de la respuesta. Por defecto 4096                     |
| `NVIDIA_TEMPERATURE`   | no               | Por defecto 0.7                                            |
| `NVIDIA_REASONING_EFFORT` | no            | Solo Kimi: `low`, `high` o `max`. Por defecto `low`        |

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
3. **Dockerfile Path:** `./backend/Dockerfile`. Esa ruta se resuelve desde la
   raiz del repo, no desde el Root Directory; si Render dice que no encuentra
   el Dockerfile, prueba `./Dockerfile`.
4. **Instance Type:** `Free`.
5. **Health Check Path:** `/api/health/`.
6. **Region:** la misma de la base (Oregon), o la URL interna no funciona.
7. Variables de entorno:

   | Variable               | Valor                                                             |
   | ---------------------- | ----------------------------------------------------------------- |
   | `DJANGO_DEBUG`         | `False`                                                           |
   | `DJANGO_SECRET_KEY`    | Generala con el boton *Generate* de Render                        |
   | `DATABASE_URL`         | URL **interna** de la base (`dpg-...-a`, sin dominio)             |
   | `CORS_ALLOWED_ORIGINS` | La URL del frontend ya desplegado, ej. `https://algo.onrender.com` |
   | `NVIDIA_API_KEY`       | Tu key (solo aqui, nunca en el repo)                              |
   | `NVIDIA_MODEL`         | `moonshotai/kimi-k3`                                              |
   | `WEB_CONCURRENCY`      | `2`                                                               |
   | `GUNICORN_THREADS`     | `8`                                                               |

   `PORT` y `RENDER_EXTERNAL_HOSTNAME` las pone Render; el proyecto ya las usa.

8. En el **frontend**, define `VITE_API_URL` con la URL del backend y vuelve a
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
