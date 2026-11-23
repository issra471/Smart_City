"""Retire les anciennes observations de démonstration : elles n'avaient pas de position sur la carte."""
from django.db import migrations


def retirer(apps, schema_editor):
    apps.get_model("animaux", "Observation").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("animaux", "0001_initial")]
    operations = [migrations.RunPython(retirer, migrations.RunPython.noop)]
