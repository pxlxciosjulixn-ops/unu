"""
Endpoints de la página de ubicación.

- `config`: los textos de la página (público, solo lectura).
- `registrar`: guarda una visita. Lo llama el frontend SOLO cuando la persona
  le da "Aceptar", así que el consentimiento está implícito en la llamada.
- `registros`: la lista para el mapa; pide sesión (login).
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from chat.services import ip_del_visitante
from ubicacion import services
from ubicacion.models import ConfigUbicacion, RegistroUbicacion
from ubicacion.serializers import (
    ConfigUbicacionSerializer,
    RegistroUbicacionSerializer,
)


class UbicacionThrottle(ScopedRateThrottle):
    scope = "ubicacion"

    def allow_request(self, request, view) -> bool:
        # Leer los textos no gasta cupo; solo se limita guardar.
        if request.method == "GET":
            return True
        return super().allow_request(request, view)


def _numero(valor: object) -> float | None:
    try:
        return float(valor)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


@api_view(["GET"])
def config(request: Request) -> Response:
    return Response(ConfigUbicacionSerializer(ConfigUbicacion.actual()).data)


@api_view(["POST"])
@throttle_classes([UbicacionThrottle])
def registrar(request: Request) -> Response:
    """
    Guarda la visita de quien aceptó. El cuerpo puede traer el GPS del
    navegador (`lat`, `lon`, `precision`); si no, se guarda solo lo de la IP.
    """
    ip = ip_del_visitante(request)
    datos = request.data if isinstance(request.data, dict) else {}

    registro = RegistroUbicacion.objects.create(
        ip=ip[:45],
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:400],
        lat_gps=_numero(datos.get("lat")),
        lon_gps=_numero(datos.get("lon")),
        precision_gps=_numero(datos.get("precision")),
        **services.geolocalizar(ip),
    )
    return Response(
        RegistroUbicacionSerializer(registro).data, status=status.HTTP_201_CREATED
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def registros(request: Request) -> Response:
    """Las últimas visitas registradas, para el mapa. Solo con sesión."""
    filas = RegistroUbicacion.objects.all()[:500]
    return Response(RegistroUbicacionSerializer(filas, many=True).data)
