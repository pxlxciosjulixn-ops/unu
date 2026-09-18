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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor = models.CharField(
        "visitante", max_length=64, db_index=True, help_text="Hash de la IP"
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
