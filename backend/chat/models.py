"""
Conversaciones del chatbot.

No hay inicio de sesion, asi que las conversaciones se agrupan por visitante
usando su IP. En la base no se guarda la IP en claro sino un hash con sal: sirve
igual para reconocer al mismo visitante y evita almacenar un dato personal que
nadie va a leer a mano.
"""

import uuid

from django.db import models


class AnalisisConversacion(models.Model):
    """
    Un chat de WhatsApp exportado (.txt) que el visitante subio como contexto.

    El archivo no se guarda: se lee al subirlo y aqui queda el chat ya limpio
    (sin avisos del sistema ni stickers), una linea por mensaje. Pertenece al
    visitante que lo subio: solo esa IP lo ve y lo puede usar en el chat.
    """

    visitor = models.CharField(
        "visitante", max_length=64, db_index=True, help_text="Hash de la IP"
    )
    nombre = models.CharField("nombre del archivo", max_length=120)
    participantes = models.JSONField("participantes", default=list)
    total_mensajes = models.PositiveIntegerField("mensajes", default=0)
    # Tal como vienen en el export: WhatsApp escribe la fecha segun el idioma
    # del telefono (dia/mes o mes/dia), asi que no se intenta convertirla.
    desde = models.CharField("primer mensaje", max_length=40, blank=True)
    hasta = models.CharField("ultimo mensaje", max_length=40, blank=True)
    contenido = models.TextField("conversacion")

    class Relacion(models.TextChoices):
        AMISTAD = "amistad", "Amigo o amiga"
        PAREJA = "pareja", "Pareja"
        ME_GUSTA = "me_gusta", "Me gusta"
        AMANTE = "amante", "Amante"
        EX = "ex", "Ex"
        FAMILIA = "familia", "Familiar"
        TRABAJO = "trabajo", "Trabajo o estudio"
        OTRA = "otra", "Otra"

    # Que es la otra persona para quien subio el chat: el consejero enfoca
    # sus consejos segun esto (no es lo mismo un amigo que una pareja).
    relacion = models.CharField(
        "relación", max_length=16, choices=Relacion.choices, blank=True
    )
    # Como aparece en el chat quien lo subio. Los iPhone en español lo
    # exportan como "Tú"; otros telefonos ponen su nombre y se pregunta.
    yo = models.CharField("quien lo subió", max_length=120, default="Tú")
    # Lo que contó al importarlo, para que el consejero se ubique:
    # `{"respuestas": [{"pregunta", "respuesta"}], "desde": "AAAA-MM-DD",
    #   "completo": bool}`. `desde` es desde cuándo hablan; `completo`, si el
    # archivo es toda la conversación o solo una parte.
    perfil = models.JSONField("contexto que dio", default=dict, blank=True)
    created_at = models.DateTimeField("subido", auto_now_add=True)
    # Borrar desde la pagina solo lo oculta: el chat queda en la base para
    # usarlo despues (analisis, admin). Ver `Conversation.borrada_en`.
    borrado_en = models.DateTimeField(
        "oculto por el visitante", null=True, blank=True, db_index=True
    )
    # "Eliminar definitivamente" desde la papelera: tampoco sale ahi ni se
    # puede restaurar, pero el chat sigue en la base.
    eliminado_en = models.DateTimeField(
        "eliminado definitivamente", null=True, blank=True, db_index=True
    )

    class Meta:
        db_table = "analisis_conversaciones"
        verbose_name = "análisis de conversación"
        verbose_name_plural = "análisis de conversaciones"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["visitor", "-created_at"])]

    def __str__(self) -> str:
        return self.nombre


class PreferenciaVisitante(models.Model):
    """Como quiere cada visitante que le hable el consejero."""

    class Groseria(models.TextChoices):
        SUAVE = "suave", "Suave"
        NORMAL = "normal", "Normal"
        SIN_FILTRO = "sin_filtro", "Sin filtro"

    visitor = models.CharField(
        "visitante", max_length=64, unique=True, help_text="Hash de la IP"
    )
    groseria = models.CharField(
        "nivel de grosería", max_length=16, choices=Groseria.choices,
        default=Groseria.SIN_FILTRO,
    )

    class Personalidad(models.TextChoices):
        CONSEJERO = "consejero", "Consejero"
        AMIGO = "amigo", "Amigo sincero"
        PSICOLOGO = "psicologo", "Psicólogo"
        ABUELA = "abuela", "Tu abuela"
        COACH = "coach", "Coach de conquista"
        CHISMOSA = "chismosa", "Mejor amiga chismosa"

    # Quién habla: cambia el tono, no el nivel de groserías ni el trato.
    personalidad = models.CharField(
        "personalidad", max_length=16, choices=Personalidad.choices,
        default=Personalidad.CONSEJERO,
    )
    # Sin tope de mensajes: lo activa el dueño con la clave de ajustes para
    # su propia conexión.
    sin_limite = models.BooleanField("mensajes ilimitados", default=False)
    updated_at = models.DateTimeField("actualizada", auto_now=True)

    class Meta:
        verbose_name = "preferencia del visitante"
        verbose_name_plural = "preferencias de los visitantes"

    def __str__(self) -> str:
        return f"{self.visitor[:8]}… {self.groseria}"


class AjustesConsejero(models.Model):
    """
    Ajustes del consejero para todos los visitantes. Es una sola fila y solo
    se cambia con la clave de ajustes (`CONSEJERO_CLAVE_AJUSTES`).
    """

    MIN_CARACTERES = 200
    MAX_CARACTERES = 4000

    max_caracteres = models.PositiveIntegerField(
        # Corto por defecto: cada caracter de respuesta se paga en tokens.
        "largo máximo de las respuestas (caracteres)", default=200
    )
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "ajustes del consejero"
        verbose_name_plural = "ajustes del consejero"

    def __str__(self) -> str:
        return f"Respuestas de hasta {self.max_caracteres} caracteres"

    @classmethod
    def actuales(cls) -> "AjustesConsejero":
        ajustes, _ = cls.objects.get_or_create(pk=1)
        return ajustes


class Conversation(models.Model):
    class Scope(models.TextChoices):
        GENERAL = "general", "Asistente general"
        RESUME = "resume", "Solo la hoja de vida"
        FINANZAS = "finanzas", "Finanzas personales"
        CONSEJOS = "consejos", "Consejos sobre un chat de WhatsApp"

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
    # El chat de WhatsApp que el asistente usa como contexto (solo en
    # conversaciones `consejos`). Si el visitante lo borra, la conversacion
    # queda pero el asistente ya no tiene de donde leer.
    analisis = models.ForeignKey(
        AnalisisConversacion,
        verbose_name="chat de contexto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversaciones",
    )
    title = models.CharField("titulo", max_length=120, blank=True)
    created_at = models.DateTimeField("creada", auto_now_add=True)
    updated_at = models.DateTimeField("actualizada", auto_now=True)
    # Cuando el visitante la borra, desaparece de su historial pero la
    # conversacion y sus mensajes se quedan en la base: se necesitan despues.
    borrada_en = models.DateTimeField(
        "oculta por el visitante", null=True, blank=True, db_index=True
    )
    # Lo mismo que `AnalisisConversacion.eliminado_en`: fuera de la papelera,
    # dentro de la base.
    eliminada_en = models.DateTimeField(
        "eliminada definitivamente", null=True, blank=True, db_index=True
    )

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


class Valoracion(models.Model):
    """
    "¿Te sirvió?" de una respuesta del consejero. Guarda con qué personalidad
    y nivel de groserías se respondió, para saber qué combinación gusta más.
    """

    mensaje = models.OneToOneField(
        Message, verbose_name="respuesta", on_delete=models.CASCADE,
        related_name="valoracion",
    )
    visitor = models.CharField("visitante", max_length=64, help_text="Hash de la IP")
    util = models.BooleanField("le sirvió")
    personalidad = models.CharField("personalidad", max_length=16, blank=True)
    groseria = models.CharField("nivel de grosería", max_length=16, blank=True)
    created_at = models.DateTimeField("creada", auto_now_add=True)
    updated_at = models.DateTimeField("actualizada", auto_now=True)

    class Meta:
        verbose_name = "valoración"
        verbose_name_plural = "valoraciones"
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{'👍' if self.util else '👎'} {self.personalidad}/{self.groseria}"
