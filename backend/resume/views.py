"""
Endpoints de la hoja de vida.

Leer es publico: la pagina del CV la ve cualquiera. Escribir exige sesion, que
es el login con JWT que ya tiene el proyecto.

Las secciones de lista se guardan completas: el editor manda el arreglo tal
como quedo en pantalla y aqui se reemplaza. Es mas simple que ir siguiendo
altas, bajas y cambios de orden uno por uno, y el orden que ve el usuario es
exactamente el que queda guardado.
"""

from __future__ import annotations

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from resume import models, serializers
from resume.limites import LIMITES


class Seccion:
    """Una lista editable de la hoja de vida."""

    def __init__(self, modelo, serializador, limites: dict, filtro: dict | None = None):
        self.modelo = modelo
        self.serializador = serializador
        self.limites = limites
        # Formacion y certificaciones comparten tabla; el filtro las separa.
        self.filtro = filtro or {}

    def consulta(self):
        return self.modelo.objects.filter(**self.filtro)

    def leer(self) -> list[dict]:
        return self.serializador(self.consulta(), many=True).data


SECCIONES: dict[str, Seccion] = {
    "about": Seccion(models.Highlight, serializers.HighlightSerializer, LIMITES["about"]),
    "skill_groups": Seccion(
        models.SkillGroup, serializers.SkillGroupSerializer, LIMITES["skill_groups"]
    ),
    "languages": Seccion(
        models.Language, serializers.LanguageSerializer, LIMITES["languages"]
    ),
    "personal_details": Seccion(
        models.PersonalDetail,
        serializers.PersonalDetailSerializer,
        LIMITES["personal_details"],
    ),
    "references": Seccion(
        models.Reference, serializers.ReferenceSerializer, LIMITES["references"]
    ),
    "experiences": Seccion(
        models.Experience, serializers.ExperienceSerializer, LIMITES["experiences"]
    ),
    "education": Seccion(
        models.Formation,
        serializers.FormationSerializer,
        LIMITES["education"],
        {"kind": models.Formation.Kind.EDUCATION},
    ),
    "certifications": Seccion(
        models.Formation,
        serializers.FormationSerializer,
        LIMITES["certifications"],
        {"kind": models.Formation.Kind.CERTIFICATION},
    ),
}


def _perfil() -> models.ResumeProfile | None:
    return models.ResumeProfile.objects.first()


def _hoja_de_vida() -> dict:
    perfil = _perfil()
    datos = {
        # Los mismos topes que valida el servidor, para que el editor pueda
        # contar los caracteres sin tenerlos escritos aparte.
        "limits": LIMITES,
        "niveles_idioma": [
            {"value": valor, "label": etiqueta, "percent": models.Language.PORCENTAJE[valor]}
            for valor, etiqueta in models.Language.Level.choices
        ],
        "profile": serializers.ProfileSerializer(perfil).data if perfil else None,
    }
    for nombre, seccion in SECCIONES.items():
        datos[nombre] = seccion.leer()
    return datos


@api_view(["GET"])
def hoja_de_vida(request: Request) -> Response:
    """
    La hoja de vida completa, tal como la pinta la pagina.

    Si nadie la ha guardado todavia, `profile` viene en `null` y las listas
    vacias: el frontend muestra entonces la version que trae empaquetada.
    """
    return Response(_hoja_de_vida())


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def perfil(request: Request) -> Response:
    """Encabezado y contacto. Es una sola fila, por eso no es una lista."""
    instancia = _perfil()
    serializador = serializers.ProfileSerializer(
        instancia, data=request.data, partial=request.method == "PATCH"
    )
    serializador.is_valid(raise_exception=True)
    serializador.save()
    return Response(serializador.data)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def seccion(request: Request, nombre: str) -> Response:
    """Reemplaza una seccion de lista con lo que mande el editor."""
    elegida = SECCIONES.get(nombre)
    if elegida is None:
        return Response(
            {"detail": f"No existe la seccion '{nombre}'."},
            status=status.HTTP_404_NOT_FOUND,
        )

    entrada = request.data
    if isinstance(entrada, dict):
        # Tambien se acepta {"items": [...]}, que es como lo mandaria una
        # herramienta que no sepa enviar un arreglo suelto.
        entrada = entrada.get("items", entrada)
    if not isinstance(entrada, list):
        return Response(
            {"detail": "Se espera una lista de elementos."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tope = elegida.limites.get("max_items")
    if tope is not None and len(entrada) > tope:
        return Response(
            {"detail": f"Maximo {tope} elementos en esta seccion."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializador = elegida.serializador(data=entrada, many=True)
    serializador.is_valid(raise_exception=True)

    # Se valida todo antes de tocar la base: o entra la seccion completa, o no
    # entra nada y lo que ya estaba guardado sigue intacto.
    with transaction.atomic():
        elegida.consulta().delete()
        elegida.modelo.objects.bulk_create(
            [
                elegida.modelo(order=posicion, **elegida.filtro, **datos)
                for posicion, datos in enumerate(serializador.validated_data)
            ]
        )

    return Response(elegida.leer())
