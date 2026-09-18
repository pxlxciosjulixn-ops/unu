"""
Conversaciones del chatbot.

No hay inicio de sesion, asi que las conversaciones se agrupan por visitante
usando su IP. En la base no se guarda la IP en claro sino un hash con sal: sirve
igual para reconocer al mismo visitante y evita almacenar un dato personal que
nadie va a leer a mano.
"""

import uuid

from django.db import models


class Conversation(models.Model):
    class Scope(models.TextChoices):
        GENERAL = "general", "Asistente general"
        RESUME = "resume", "Solo la hoja de vida"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor = models.CharField(
        "visitante", max_length=64, db_index=True, help_text="Hash de la IP"
    )
    # De que puede hablar el asistente en esta conversacion. El chat flotante
    # de la hoja de vida abre conversaciones `resume`, que solo responden con
    # lo que hay en el CV; la pagina /chatbot sigue siendo el asistente
    # general. Se guarda en la conversacion y no en cada mensaje porque no
    # cambia a mitad de charla.
    scope = models.CharField(
        "alcance", max_length=16, choices=Scope.choices, default=Scope.GENERAL
    )
    title = models.CharField("titulo", max_length=120, blank=True)
    created_at = models.DateTimeField("creada", auto_now_add=True)
    updated_at = models.DateTimeField("actualizada", auto_now=True)

    class Meta:
        verbose_name = "conversacion"
        verbose_name_plural = "conversaciones"
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["visitor", "-updated_at"])]

    def __str__(self) -> str:
        return self.title or str(self.id)


class ChatQuota(models.Model):
    """
    Cuantos mensajes lleva gastados un visitante.

    Va en su propia tabla y no se cuenta sobre los mensajes guardados a
    proposito: el visitante puede borrar sus conversaciones, y si el cupo
    saliera de ahi, borrarlas seria la forma de estrenarlo otra vez.

    El cupo es por alcance porque los dos chats cuestan distinto: el de la hoja
    de vida manda el CV entero en cada turno.
    """

    visitor = models.CharField("visitante", max_length=64, help_text="Hash de la IP")
    scope = models.CharField("alcance", max_length=16, choices=Conversation.Scope.choices)
    used = models.PositiveIntegerField("mensajes gastados", default=0)
    updated_at = models.DateTimeField("ultimo mensaje", auto_now=True)

    class Meta:
        verbose_name = "cupo del chat"
        verbose_name_plural = "cupos del chat"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["visitor", "scope"], name="cupo_unico_por_visitante_y_alcance"
            )
        ]

    def __str__(self) -> str:
        return f"{self.visitor[:8]}… {self.scope}: {self.used}"


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "Usuario"
        ASSISTANT = "assistant", "Asistente"

    conversation = models.ForeignKey(
        Conversation,
        verbose_name="conversacion",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField("rol", max_length=16, choices=Role.choices)
    content = models.TextField("contenido")
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "mensaje"
        verbose_name_plural = "mensajes"
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["conversation", "created_at"])]

    def __str__(self) -> str:
        return f"{self.role}: {self.content[:40]}"
