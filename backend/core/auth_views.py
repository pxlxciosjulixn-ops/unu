"""
Autenticacion con JWT.

El login devuelve dos tokens: uno de acceso (corto) que acompaña a cada
peticion, y uno de refresco (largo) que sirve para pedir un acceso nuevo sin
volver a escribir la contraseña.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class LoginThrottle(ScopedRateThrottle):
    """Frena los intentos a ciegas contra el formulario de ingreso."""

    scope = "login"


class LoginSerializer(TokenObtainPairSerializer):
    """Agrega los datos del usuario a la respuesta del login."""

    def validate(self, attrs):
        datos = super().validate(attrs)
        datos["user"] = usuario_como_dict(self.user)
        return datos


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [LoginThrottle]


class RefreshView(TokenRefreshView):
    throttle_classes = [LoginThrottle]


def usuario_como_dict(usuario) -> dict:
    """Lo mínimo que el frontend necesita mostrar. Nunca la contraseña."""
    return {
        "username": usuario.get_username(),
        "first_name": usuario.first_name,
        "email": usuario.email,
        "is_staff": usuario.is_staff,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request: Request) -> Response:
    """
    Quién es el dueño del token.

    La página protegida la llama al cargar: si responde 401, el token ya no
    sirve y el frontend manda al login.
    """
    return Response(usuario_como_dict(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([LoginThrottle])
def logout(request: Request) -> Response:
    """
    Cierre de sesión: invalida el token de refresco.

    El de acceso sigue vivo hasta que expire (son minutos, por eso se emite
    corto), pero sin refresco no se puede renovar la sesión. Si no llega el
    refresco, responde igual: el frontend ya botó sus tokens y no hay nada que
    reclamarle.
    """
    crudo = request.data.get("refresh")
    if crudo:
        try:
            RefreshToken(crudo).blacklist()
        except TokenError:
            # Ya estaba vencido o en la lista negra: el resultado es el mismo.
            pass

    return Response(status=status.HTTP_204_NO_CONTENT)
