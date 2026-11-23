"""Retire les anciennes stations et réservations (données de démonstration).

Elles n'avaient ni position sur la carte ni station d'arrivée : elles ne peuvent
pas être converties vers le nouveau modèle (voir la migration suivante).
"""
from django.db import migrations


def retirer(apps, schema_editor):
    apps.get_model("mobilite", "Reservation").objects.all().delete()
    apps.get_model("mobilite", "Station").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("mobilite", "0001_initial")]
    operations = [migrations.RunPython(retirer, migrations.RunPython.noop)]
