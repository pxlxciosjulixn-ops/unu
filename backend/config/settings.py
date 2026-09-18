"""
Configuracion de Django para el proyecto `unu`.

Todos los valores sensibles o dependientes del entorno se leen de un archivo
`.env` (ver `.env.example`). Nada de secretos hardcodeados aqui.
"""

from pathlib import Path

import dj_database_url
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Carga las variables de `backend/.env` en el entorno del proceso.
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    """Lee un booleano del entorno aceptando 1/true/yes/on."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    """Lee una lista separada por comas, ignorando espacios y vacios."""
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Seguridad
# ---------------------------------------------------------------------------

DEBUG = env_bool("DJANGO_DEBUG", default=False)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if DEBUG:
        # Solo para desarrollo: evita que el proyecto no arranque sin .env.
        SECRET_KEY = "django-insecure-solo-para-desarrollo-local"
    else:
        raise RuntimeError(
            "DJANGO_SECRET_KEY es obligatoria cuando DJANGO_DEBUG=False. "
            "Definela en el .env o en las variables de entorno del servidor."
        )

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# Render expone el hostname publico del servicio en esta variable.
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

CSRF_TRUSTED_ORIGINS = [
    f"https://{host}" for host in ALLOWED_HOSTS if host not in {"localhost", "127.0.0.1", "*"}
]

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # El health check de Render entra por HTTP interno y sin la cabecera del
    # proxy: sin esta excepcion recibiria un 301 y marcaria el servicio caido.
    SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]

    # HSTS: el servicio de Render solo se sirve por HTTPS. Si algun dia se usa
    # un dominio propio, confirma que todo el dominio va por HTTPS antes de
    # activar `DJANGO_HSTS_INCLUDE_SUBDOMAINS`.
    SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_HSTS_INCLUDE_SUBDOMAINS")
    SECURE_HSTS_PRELOAD = env_bool("DJANGO_HSTS_PRELOAD")


# ---------------------------------------------------------------------------
# Aplicaciones
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "corsheaders",
    # Propias
    "core",
    "chat",
    "dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise sirve los estaticos en produccion; va justo despues de Security.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # CORS debe ir lo mas arriba posible y siempre antes de CommonMiddleware.
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ---------------------------------------------------------------------------
# Base de datos
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            # Reutiliza conexiones 10 min: importante con una base remota.
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Sin DATABASE_URL el proyecto sigue arrancando con SQLite.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # El chat gasta cuota de NVIDIA con cada llamada: se limita por IP.
    "DEFAULT_THROTTLE_RATES": {"chat": "20/min"},
}

if DEBUG:
    # La interfaz navegable de DRF solo tiene sentido en desarrollo.
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "rest_framework.renderers.BrowsableAPIRenderer"
    )


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ALLOW_CREDENTIALS = True


# ---------------------------------------------------------------------------
# Autenticacion
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ---------------------------------------------------------------------------
# Internacionalizacion
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True


# ---------------------------------------------------------------------------
# Archivos estaticos
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ---------------------------------------------------------------------------
# Integraciones externas
# ---------------------------------------------------------------------------

# Se leen aqui para que toda la app consuma la config desde un solo lugar.
#
# El chat habla con una API compatible con la de OpenAI, asi que cambiar de
# proveedor es cambiar `CHAT_PROVIDER`: "openai" o "nvidia".
CHAT_PROVIDER = os.getenv("CHAT_PROVIDER", "openai").strip().lower()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
# `OPENAI_DEFAULT_MODEL` es el nombre que ya venia en el .env.
OPENAI_MODEL = os.getenv("OPENAI_MODEL") or os.getenv(
    "OPENAI_DEFAULT_MODEL", "gpt-4o-mini"
)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "moonshotai/kimi-k3")
# Solo lo usan los modelos que razonan (Kimi acepta low, high o max).
NVIDIA_REASONING_EFFORT = os.getenv("NVIDIA_REASONING_EFFORT", "low")

# Comunes a los dos proveedores.
CHAT_MAX_TOKENS = int(os.getenv("CHAT_MAX_TOKENS", os.getenv("NVIDIA_MAX_TOKENS", "4096")))
CHAT_TEMPERATURE = float(
    os.getenv("CHAT_TEMPERATURE", os.getenv("NVIDIA_TEMPERATURE", "0.7"))
)
