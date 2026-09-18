# unu — backend

Esqueleto de API con Django 6.1 + Django REST Framework, conectado a PostgreSQL.

## Estructura

```
backend/
  config/          # proyecto Django (settings, urls, wsgi, asgi)
  core/            # app transversal: health check y chat con el modelo
  dashboard/       # modelos, endpoints y datos de prueba del tablero
  resume/          # la hoja de vida en base de datos y su API de edicion
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
| GET    | `/api/chat/conversations/`       | Historial del visitante (`?scope=`)            |
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
| GET    | `/api/resume/`                   | La hoja de vida completa, con sus límites      |
| PUT    | `/api/resume/profile/`           | Encabezado y contacto (exige sesión)           |
| PUT    | `/api/resume/<sección>/`         | Reemplaza una sección de lista (exige sesión)  |
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
{ "message": "Hola", "conversation_id": "uuid opcional", "scope": "general" }
```

Sin `conversation_id` se crea una conversación nueva y su identificador llega
en el evento `start`. El historial lo arma el servidor leyendo la base, no el
navegador.

### Alcance: el chat de la hoja de vida

`scope` decide de qué puede hablar el asistente, y queda guardado en la
conversación:

- **`general`** (por defecto): el asistente de la página `/chatbot`.
- **`resume`**: el chat flotante de la hoja de vida. Sus instrucciones se arman
  en cada mensaje con el CV leído de la base (`resume.contexto`), y le prohíben
  responder con algo que no esté ahí o hablar de otros temas. Como el contexto
  se arma en el momento, lo que se edite en `/home/hoja-de-vida` cambia las
  respuestas en el siguiente mensaje, sin reiniciar ni limpiar cache. Si la base
  todavía no tiene hoja de vida, el asistente responde que no tiene el perfil en
  vez de inventarlo.

`GET /api/chat/conversations/` filtra por `?scope=` (general por defecto), para
que el historial de la página `/chatbot` no se mezcle con las preguntas sueltas
del chat de la hoja de vida.

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

### Cuanto gasta cada chat

Todo esto vive en `chat/services.py`, que es donde se ajusta:

| | Asistente general (`/chatbot`) | Hoja de vida (widget) |
| --- | --- | --- |
| Pregunta | 6.000 caracteres | 300 caracteres |
| Respuesta | 600 tokens | 220 tokens |
| Historial que se arrastra | 20 mensajes | 6 mensajes |
| Cupo por visitante | 5 mensajes | sin tope |

Los dos prompts piden respuestas concretas y sin relleno (nada de presentarse,
repetir la pregunta ni ofrecer mas ayuda al final). El del CV manda ademas la
hoja de vida entera en cada turno, unos 9.000 caracteres: por eso es el que
lleva los numeros mas cortos.

**El cupo** (`CUPO_POR_VISITANTE`) es un tope total por visitante, no por
minuto: cuando se acaba, `POST /api/chat/` responde `429` con el mensaje ya
listo para mostrar. Se lleva en la tabla `ChatQuota` y no contando los mensajes
guardados, porque el visitante puede borrar sus conversaciones y entonces
borrarlas seria la forma de estrenar el cupo otra vez.

`GET /api/chat/conversations/` devuelve tambien `quota` (`used`, `limit`,
`remaining`), que es lo que la pagina usa para mostrar cuantos mensajes quedan
y desactivar la caja al llegar a cero. `limit` y `remaining` van en `null`
cuando ese chat no tiene tope.

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

## Hoja de vida

El CV vive en la base (app `resume`) y se edita desde el sitio, en
`/home/hoja-de-vida`, detrás del login. `GET /api/resume/` es público —lo
consume la página pública— y las escrituras exigen el token JWT.

La respuesta trae, además de los datos, el bloque `limits`: el tope de
caracteres de cada campo y el máximo de elementos de cada lista. Salen de
`resume/limites.py`, que es de donde también se sacan los `max_length` de los
modelos y las validaciones de la API. El editor los usa para sus contadores, de
modo que lo que deja escribir es exactamente lo que el servidor acepta y lo que
cabe en su caja de la hoja. Si un texto se queda corto, se cambia el número ahí
(y se genera la migración si cambió un `max_length`).

Las secciones de lista se guardan completas: el editor manda el arreglo como
quedó en pantalla y el backend reemplaza la sección dentro de una transacción.
Si algún elemento no pasa la validación, no se guarda nada y lo anterior queda
intacto.

Secciones: `about`, `skill_groups`, `languages`, `personal_details`,
`references`, `experiences`, `education`, `certifications`.

Para cargar el CV inicial (el que antes vivía en el frontend):

```bash
env/Scripts/python.exe manage.py seed_resume
```

No pisa nada: si ya hay perfil guardado, no toca la base. Con `--reset` sí borra
y vuelve a escribir los datos de origen. El contenedor lo corre en cada arranque
(`SEED_RESUME=1` por defecto), así que la hoja existe desde el primer despliegue
y lo que se edite después se queda.

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
