"""
Endpoints de las finanzas personales.

No piden sesion: el formulario y el dashboard son publicos, solo que su
direccion no esta enlazada en ninguna parte del sitio. Crear se limita por IP
para que un bot que dé con la ruta no llene la tabla.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from finanzas import avisos, models, serializers


class FinanzasThrottle(ScopedRateThrottle):
    scope = "finanzas"

    def allow_request(self, request, view) -> bool:
        # Leer no cuenta contra el cupo: el dashboard recarga seguido.
        if request.method == "GET":
            return True
        return super().allow_request(request, view)


@api_view(["GET", "POST"])
@throttle_classes([FinanzasThrottle])
def movimientos(request: Request) -> Response:
    """
    GET: todos los movimientos, del mas reciente al mas viejo. Van completos y
    sin paginar: el dashboard agrupa por mes y por concepto en el navegador.

    POST: registra uno nuevo y, si con eso el mes en curso queda en rojo,
    manda la alerta por correo.
    """
    # El resumen del mes pasado sale con la primera actividad del mes nuevo
    # (ver `avisos.py`): son dos consultas y el envio va en otro hilo.
    avisos.revisar_resumen_pendiente()

    if request.method == "GET":
        datos = serializers.MovimientoSerializer(
            models.Movimiento.objects.all(), many=True
        ).data
        return Response(datos)

    serializador = serializers.MovimientoSerializer(data=request.data)
    serializador.is_valid(raise_exception=True)
    serializador.save()
    avisos.revisar_sobregasto()
    return Response(serializador.data, status=status.HTTP_201_CREATED)
