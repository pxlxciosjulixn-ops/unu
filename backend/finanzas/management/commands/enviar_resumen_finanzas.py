"""
Manda por correo el resumen de un mes.

    python manage.py enviar_resumen_finanzas              # el mes pasado, si falta
    python manage.py enviar_resumen_finanzas --mes 2026-08 --forzar
    python manage.py enviar_resumen_finanzas --mes 2026-08 --ver > correo.html

Sin `--forzar` no repite un resumen que ya salió. `--ver` no manda nada:
imprime el HTML del correo para revisarlo.
"""

from __future__ import annotations

from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from finanzas import gmail
from finanzas.avisos import correo_resumen
from finanzas.calculos import mes_anterior, resumen_mes
from finanzas.models import AvisoEnviado


class Command(BaseCommand):
    help = "Manda por correo el resumen de finanzas de un mes."

    def add_arguments(self, parser):
        parser.add_argument("--mes", help="AAAA-MM. Por defecto, el mes pasado.")
        parser.add_argument("--forzar", action="store_true", help="Mandarlo aunque ya haya salido.")
        parser.add_argument("--ver", action="store_true", help="Imprimir el HTML sin mandar nada.")

    def handle(self, *args, mes=None, forzar=False, ver=False, **opciones):
        if mes:
            try:
                anio, numero = (int(p) for p in mes.split("-"))
                elegido = date(anio, numero, 1)
            except ValueError as exc:
                raise CommandError("--mes va como AAAA-MM, por ejemplo 2026-08.") from exc
        else:
            elegido = mes_anterior(timezone.localdate())

        asunto, texto, html = correo_resumen(resumen_mes(elegido), resumen_mes(mes_anterior(elegido)))
        if ver:
            self.stdout.write(html)
            return

        tipo = AvisoEnviado.Tipo.RESUMEN
        if not forzar and AvisoEnviado.objects.filter(tipo=tipo, mes=elegido).exists():
            self.stdout.write(f"El resumen de {elegido:%Y-%m} ya salió. Usa --forzar para repetirlo.")
            return

        try:
            gmail.enviar(settings.FINANZAS_CORREO_DESTINO, asunto, texto, html)
        except gmail.GmailError as exc:
            raise CommandError(str(exc)) from exc

        AvisoEnviado.objects.get_or_create(tipo=tipo, mes=elegido)
        self.stdout.write(self.style.SUCCESS(f"Enviado a {settings.FINANZAS_CORREO_DESTINO}: {asunto}"))
