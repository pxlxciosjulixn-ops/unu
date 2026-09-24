"""
La tabla de sugerencias, sembrada con los conceptos que hasta ahora vivian en
una lista de Python (`conceptos.CONCEPTOS_SEMILLA`). Desde aqui se pueden
agregar y quitar desde la pagina de edicion.
"""

from django.db import migrations, models

import finanzas.conceptos


def sembrar(apps, schema_editor):
    Sugerencia = apps.get_model("finanzas", "Sugerencia")
    Sugerencia.objects.bulk_create(
        [
            Sugerencia(nombre=nombre, clave=finanzas.conceptos.clave(nombre))
            for nombre in finanzas.conceptos.CONCEPTOS_SEMILLA
        ],
        # Si la migracion se corre sobre una base que ya las tiene, no choca.
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):
    dependencies = [("finanzas", "0003_homogenizar_conceptos")]

    operations = [
        migrations.CreateModel(
            name="Sugerencia",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nombre", models.CharField(max_length=100, verbose_name="nombre")),
                (
                    "clave",
                    models.CharField(
                        editable=False,
                        max_length=100,
                        unique=True,
                        verbose_name="clave",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="creado"),
                ),
            ],
            options={
                "verbose_name": "sugerencia",
                "verbose_name_plural": "sugerencias",
                "ordering": ["nombre"],
            },
        ),
        migrations.RunPython(sembrar, migrations.RunPython.noop),
    ]
