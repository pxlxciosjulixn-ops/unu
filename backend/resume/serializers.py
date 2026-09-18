"""
Serializadores de la hoja de vida.

La API entrega y recibe las listas de texto (funciones de un cargo,
herramientas de un grupo) como arreglos, aunque en la base vivan en un solo
campo; `ListaDeTextosField` hace la conversion en los dos sentidos y de paso
aplica el tope de caracteres de cada elemento y de cantidad de elementos.
"""

from __future__ import annotations

from rest_framework import serializers

from resume import models
from resume.limites import LIMITES


class ListaDeTextosField(serializers.ListField):
    """Lista de textos cortos que en la base es un solo campo separado por `sep`."""

    def __init__(self, *, sep: str, max_chars: int, max_items: int, **kwargs):
        self.sep = sep
        super().__init__(
            child=serializers.CharField(max_length=max_chars, allow_blank=False),
            max_length=max_items,
            allow_empty=True,
            required=False,
            **kwargs,
        )

    def to_representation(self, value) -> list[str]:
        if not value:
            return []
        return [parte.strip() for parte in str(value).split(self.sep) if parte.strip()]

    def to_internal_value(self, data) -> str:
        partes = super().to_internal_value(data)
        # Se normaliza al guardar: sin vacios y sin espacios sobrantes, para
        # que al volver a leer salga exactamente la misma lista.
        return self.sep.join(parte.strip() for parte in partes if parte.strip())


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ResumeProfile
        fields = [
            "first_name",
            "last_name",
            "title",
            "initials",
            "address",
            "phone",
            "email",
            "website",
            "website_label",
            "website_note",
            "summary",
            "show_reference_contacts",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class HighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Highlight
        fields = ["title", "text"]


class SkillGroupSerializer(serializers.ModelSerializer):
    skills = ListaDeTextosField(
        sep=",",
        max_chars=LIMITES["skill_groups"]["skill"],
        max_items=LIMITES["skill_groups"]["max_skills"],
    )

    class Meta:
        model = models.SkillGroup
        fields = ["name", "skills"]


class LanguageSerializer(serializers.ModelSerializer):
    level_label = serializers.CharField(source="get_level_display", read_only=True)
    percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = models.Language
        fields = ["name", "level", "level_label", "percent"]


class PersonalDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PersonalDetail
        fields = ["label", "value"]


class ReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Reference
        fields = ["name", "relation", "phone", "email"]


class ExperienceSerializer(serializers.ModelSerializer):
    bullets = ListaDeTextosField(
        sep="\n",
        max_chars=LIMITES["experiences"]["bullet"],
        max_items=LIMITES["experiences"]["max_bullets"],
    )
    stack = ListaDeTextosField(
        sep=",",
        max_chars=LIMITES["experiences"]["tech"],
        max_items=LIMITES["experiences"]["max_stack"],
    )
    # Se calcula con las fechas; el editor no lo manda.
    period = serializers.CharField(read_only=True)

    class Meta:
        model = models.Experience
        fields = [
            "role",
            "company",
            "location",
            "start",
            "end",
            "current",
            "period",
            "bullets",
            "stack",
        ]

    def validate_start(self, valor: str) -> str:
        return _mes_valido(valor, "inicio")

    def validate_end(self, valor: str) -> str:
        return _mes_valido(valor, "fin", permitir_vacio=True)

    def validate(self, datos: dict) -> dict:
        fin = datos.get("end", "")
        if not datos.get("current") and not fin:
            raise serializers.ValidationError(
                {"end": "Pon la fecha de fin o marca el cargo como actual."}
            )
        if fin and datos.get("start", "") > fin:
            raise serializers.ValidationError(
                {"end": "La fecha de fin no puede ser anterior a la de inicio."}
            )
        # Un cargo actual no arrastra fecha de fin: si se marca, la de antes
        # sobra y dejarla haria que la duracion se calculara mal.
        if datos.get("current"):
            datos["end"] = ""
        return datos


class FormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Formation
        fields = ["title", "institution", "location", "year", "description"]


def _mes_valido(valor: str, campo: str, permitir_vacio: bool = False) -> str:
    """Comprueba el formato AAAA-MM, que es con el que se calcula la duracion."""
    valor = (valor or "").strip()
    if not valor:
        if permitir_vacio:
            return ""
        raise serializers.ValidationError(f"Falta la fecha de {campo}.")

    partes = valor.split("-")
    if len(partes) != 2 or len(partes[0]) != 4 or not partes[1]:
        raise serializers.ValidationError("Usa el formato AAAA-MM. Ejemplo: 2025-07.")
    try:
        anio, mes = int(partes[0]), int(partes[1])
    except ValueError:
        raise serializers.ValidationError("Usa el formato AAAA-MM. Ejemplo: 2025-07.")
    if not 1900 <= anio <= 2100 or not 1 <= mes <= 12:
        raise serializers.ValidationError("El mes debe ir de 01 a 12.")

    return f"{anio:04d}-{mes:02d}"
