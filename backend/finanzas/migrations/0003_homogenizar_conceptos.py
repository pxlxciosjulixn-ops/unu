"""
Pasa los conceptos ya guardados al nombre de la lista de conceptos fijos
("mt15" → "Mt15"), para que lo registrado antes de homogenizar sume junto con
lo nuevo. Lo que no coincide con la lista solo pierde los espacios de sobra.
"""

from django.db import migrations


def homogenizar_existentes(apps, schema_editor):
    from finanzas.conceptos import homogenizar

    Movimiento = apps.get_model("finanzas", "Movimiento")
    for movimiento in Movimiento.objects.only("id", "concepto").iterator():
        nuevo = homogenizar(movimiento.concepto)
        if nuevo != movimiento.concepto:
            Movimiento.objects.filter(pk=movimiento.pk).update(concepto=nuevo)


class Migration(migrations.Migration):
    dependencies = [("finanzas", "0002_avisoenviado")]

    # Hacia atrás no hay nada que deshacer: el texto original no se guardó.
    operations = [migrations.RunPython(homogenizar_existentes, migrations.RunPython.noop)]
