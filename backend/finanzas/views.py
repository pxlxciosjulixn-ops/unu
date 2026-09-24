"""
Endpoints de las finanzas personales.

No piden sesion: el formulario, el dashboard y la pagina de edicion son
publicos, solo que su direccion no esta enlazada en ninguna parte del sitio.
Escribir se limita por IP para que un bot que dé con la ruta no llene ni vacie
la tabla.
"""

from __future__ import annotations

from django.shortcuts import get_object_or_404
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


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@throttle_classes([FinanzasThrottle])
def movimiento(request: Request, pk: int) -> Response:
    """
    Un movimiento suelto, para corregirlo o borrarlo desde la pagina de
    edicion.

    Cambiar un valor o borrar una fila mueve el balance del mes, asi que
    despues se vuelve a revisar el sobregasto: si el mes acaba de pasar a rojo
    avisa, y si volvio a quedar en positivo rearma la alerta.
    """
    fila = get_object_or_404(models.Movimiento, pk=pk)

    if request.method == "GET":
        return Response(serializers.MovimientoSerializer(fila).data)

    if request.method == "DELETE":
        fila.delete()
        avisos.revisar_sobregasto()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializador = serializers.MovimientoSerializer(
        fila, data=request.data, partial=request.method == "PATCH"
    )
    serializador.is_valid(raise_exception=True)
    serializador.save()
    avisos.revisar_sobregasto()
    return Response(serializador.data)


@api_view(["GET", "POST"])
@throttle_classes([FinanzasThrottle])
def sugerencias(request: Request) -> Response:
    """
    GET: los conceptos que se sugieren al escribir, en orden alfabetico.

    POST: agrega uno. Guardar un movimiento cuyo concepto coincida con una
    sugerencia lo deja escrito con el nombre de la sugerencia.
    """
    if request.method == "GET":
        datos = serializers.SugerenciaSerializer(
            models.Sugerencia.objects.all(), many=True
        ).data
        return Response(datos)

    serializador = serializers.SugerenciaSerializer(data=request.data)
    serializador.is_valid(raise_exception=True)
    serializador.save()
    return Response(serializador.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@throttle_classes([FinanzasThrottle])
def sugerencia(request: Request, pk: int) -> Response:
    """
    Cambia el nombre de una sugerencia o la saca de la lista.

    Los movimientos ya guardados no se tocan: conservan el texto con el que
    quedaron. Solo deja de sugerirse y de homogenizar lo que se escriba de
    aqui en adelante.
    """
    fila = get_object_or_404(models.Sugerencia, pk=pk)

    if request.method == "DELETE":
        fila.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializador = serializers.SugerenciaSerializer(
        fila, data=request.data, partial=request.method == "PATCH"
    )
    serializador.is_valid(raise_exception=True)
    serializador.save()
    return Response(serializador.data)
