"""
La hoja de vida en base de datos.

Antes el CV vivia en un archivo del frontend; aqui queda en tablas para poder
editarlo desde el sitio sin volver a desplegar. Cada texto tiene su tope de
caracteres tomado de `limites.py`, que es lo que evita que un parrafo largo
desborde su caja en la pagina.

Las listas se ordenan por `order`: la posicion la fija el editor al guardar,
que manda la seccion completa en el orden en que quedo en pantalla.
"""

from __future__ import annotations

from django.db import models

from resume.limites import LIMITES

MESES_CORTOS = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
]


def etiqueta_mes(valor: str) -> str:
    """`2025-07` se convierte en `jul. 2025`; si no tiene esa forma, se deja igual."""
    try:
        anio, mes = valor.split("-")
        return f"{MESES_CORTOS[int(mes) - 1]}. {int(anio)}"
    except (ValueError, IndexError):
        return valor


class Ordenado(models.Model):
    """Base de las listas: todas se muestran en el orden que fija el editor."""

    order = models.PositiveIntegerField("orden", default=0)

    class Meta:
        abstract = True
        ordering = ["order", "id"]


class ResumeProfile(models.Model):
    """
    Encabezado y contacto. Es una sola fila: la hoja de vida es una.

    Se fuerza `pk=1` al guardar para que no puedan aparecer dos perfiles por
    una peticion repetida.
    """

    first_name = models.CharField("nombre", max_length=LIMITES["profile"]["first_name"])
    last_name = models.CharField("apellidos", max_length=LIMITES["profile"]["last_name"])
    title = models.CharField("cargo", max_length=LIMITES["profile"]["title"])
    initials = models.CharField("iniciales", max_length=LIMITES["profile"]["initials"])
    address = models.CharField(
        "direccion", max_length=LIMITES["profile"]["address"], blank=True
    )
    phone = models.CharField("telefono", max_length=LIMITES["profile"]["phone"], blank=True)
    email = models.EmailField("correo", max_length=LIMITES["profile"]["email"], blank=True)
    website = models.URLField(
        "sitio web", max_length=LIMITES["profile"]["website"], blank=True
    )
    website_label = models.CharField(
        "texto del enlace", max_length=LIMITES["profile"]["website_label"], blank=True
    )
    website_note = models.CharField(
        "nota del enlace", max_length=LIMITES["profile"]["website_note"], blank=True
    )
    summary = models.TextField(
        "resumen", max_length=LIMITES["profile"]["summary"], blank=True
    )
    show_reference_contacts = models.BooleanField(
        "mostrar contacto de las referencias",
        default=True,
        help_text="Apagalo para ocultar telefono y correo de las referencias.",
    )
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfil"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Highlight(Ordenado):
    """Los puntos del bloque "Mi perfil"."""

    title = models.CharField("titulo", max_length=LIMITES["about"]["title"])
    text = models.TextField("texto", max_length=LIMITES["about"]["text"])

    class Meta(Ordenado.Meta):
        verbose_name = "punto del perfil"
        verbose_name_plural = "puntos del perfil"

    def __str__(self) -> str:
        return self.title


class SkillGroup(Ordenado):
    """
    Grupo de herramientas.

    Las herramientas van en un solo campo separadas por comas: son etiquetas
    cortas, siempre se leen juntas y nunca se consultan por separado, asi que
    una tabla aparte solo agregaria trabajo al guardar.
    """

    name = models.CharField("nombre", max_length=LIMITES["skill_groups"]["name"])
    skills = models.TextField(
        "herramientas", blank=True, help_text="Separadas por comas"
    )

    class Meta(Ordenado.Meta):
        verbose_name = "grupo de herramientas"
        verbose_name_plural = "grupos de herramientas"

    def __str__(self) -> str:
        return self.name


class Language(Ordenado):
    """Idioma y nivel. El nivel es una lista cerrada porque mueve la barra."""

    class Level(models.TextChoices):
        NATIVO = "nativo", "Nativo"
        AVANZADO = "avanzado", "Avanzado"
        INTERMEDIO = "intermedio", "Intermedio"
        BASICO = "basico", "Basico"

    # Cuanto llena la barra cada nivel. El CV declara palabras, no porcentajes;
    # esto solo las representa.
    PORCENTAJE = {
        Level.NATIVO: 100,
        Level.AVANZADO: 80,
        Level.INTERMEDIO: 55,
        Level.BASICO: 30,
    }

    name = models.CharField("idioma", max_length=LIMITES["languages"]["name"])
    level = models.CharField(
        "nivel", max_length=16, choices=Level.choices, default=Level.INTERMEDIO
    )

    class Meta(Ordenado.Meta):
        verbose_name = "idioma"
        verbose_name_plural = "idiomas"

    @property
    def percent(self) -> int:
        return self.PORCENTAJE.get(self.level, 0)

    def __str__(self) -> str:
        return f"{self.name} ({self.get_level_display()})"


class PersonalDetail(Ordenado):
    """Los datos sueltos del panel Informacion."""

    label = models.CharField("etiqueta", max_length=LIMITES["personal_details"]["label"])
    value = models.CharField("valor", max_length=LIMITES["personal_details"]["value"])

    class Meta(Ordenado.Meta):
        verbose_name = "dato personal"
        verbose_name_plural = "datos personales"

    def __str__(self) -> str:
        return f"{self.label}: {self.value}"


class Reference(Ordenado):
    name = models.CharField("nombre", max_length=LIMITES["references"]["name"])
    relation = models.CharField("relacion", max_length=LIMITES["references"]["relation"])
    phone = models.CharField(
        "telefono", max_length=LIMITES["references"]["phone"], blank=True
    )
    email = models.EmailField(
        "correo", max_length=LIMITES["references"]["email"], blank=True
    )

    class Meta(Ordenado.Meta):
        verbose_name = "referencia"
        verbose_name_plural = "referencias"

    def __str__(self) -> str:
        return self.name


class Experience(Ordenado):
    """
    Un cargo.

    `bullets` guarda una funcion por linea y `stack` las tecnologias separadas
    por comas, por lo mismo que en `SkillGroup`: son listas de texto que solo
    se leen completas. La API las entrega y recibe como arreglos.

    El periodo no se guarda: se arma con `start` y `end`, asi no puede quedar
    contradiciendo a las fechas con las que se calcula la duracion.
    """

    role = models.CharField("cargo", max_length=LIMITES["experiences"]["role"])
    company = models.CharField("empresa", max_length=LIMITES["experiences"]["company"])
    location = models.CharField(
        "ciudad", max_length=LIMITES["experiences"]["location"], blank=True
    )
    start = models.CharField("inicio", max_length=7, help_text="AAAA-MM")
    end = models.CharField("fin", max_length=7, blank=True, help_text="AAAA-MM")
    current = models.BooleanField("cargo actual", default=False)
    bullets = models.TextField("funciones", blank=True, help_text="Una por linea")
    stack = models.TextField("tecnologias", blank=True, help_text="Separadas por comas")

    class Meta(Ordenado.Meta):
        verbose_name = "experiencia"
        verbose_name_plural = "experiencias"

    @property
    def period(self) -> str:
        """Lo que se lee en la hoja: `jul. 2025 — Actualidad`."""
        inicio = etiqueta_mes(self.start)
        if self.current or not self.end:
            return f"{inicio} — Actualidad"
        return f"{inicio} — {etiqueta_mes(self.end)}"

    def __str__(self) -> str:
        return f"{self.role} · {self.company}"


class Formation(Ordenado):
    """Estudios y certificaciones: misma forma, distinto bloque en la pagina."""

    class Kind(models.TextChoices):
        EDUCATION = "education", "Formacion"
        CERTIFICATION = "certification", "Curso o certificacion"

    kind = models.CharField("tipo", max_length=16, choices=Kind.choices, db_index=True)
    title = models.CharField("titulo", max_length=LIMITES["education"]["title"])
    institution = models.CharField(
        "institucion", max_length=LIMITES["education"]["institution"]
    )
    location = models.CharField(
        "ciudad", max_length=LIMITES["education"]["location"], blank=True
    )
    year = models.CharField("anio", max_length=LIMITES["education"]["year"], blank=True)
    description = models.TextField(
        "descripcion", max_length=LIMITES["education"]["description"], blank=True
    )

    class Meta(Ordenado.Meta):
        verbose_name = "formacion"
        verbose_name_plural = "formacion"

    def __str__(self) -> str:
        return f"{self.title} · {self.institution}"
