"""Une station devient un lieu qui contient des transports ; une réservation va d'une station à une autre."""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mobilite", "0002_retirer_anciennes_donnees"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.DeleteModel(name="Reservation"),
        migrations.RemoveField(model_name="station", name="type"),
        migrations.RemoveField(model_name="station", name="unites_disponibles"),
        migrations.AlterField(model_name="station", name="nom", field=models.CharField(max_length=120, verbose_name="Nom de la station")),
        migrations.AlterField(model_name="station", name="adresse", field=models.CharField(blank=True, max_length=200, verbose_name="Adresse ou repère")),
        migrations.AddField(model_name="station", name="latitude", field=models.FloatField(default=0), preserve_default=False),
        migrations.AddField(model_name="station", name="longitude", field=models.FloatField(default=0), preserve_default=False),
        migrations.CreateModel(
            name="Transport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(choices=[("velo", "Vélo"), ("trottinette", "Trottinette"), ("bus", "Bus électrique")], max_length=20, verbose_name="Type de transport")),
                ("unites_disponibles", models.PositiveIntegerField(default=1, verbose_name="Nombre d'unités")),
                ("statut", models.CharField(choices=[("en_attente", "En attente"), ("approuve", "Approuvé"), ("refuse", "Refusé")], default="en_attente", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("propose_par", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="transports_proposes", to=settings.AUTH_USER_MODEL)),
                ("station", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transports", to="mobilite.station")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Reservation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_depart", models.DateTimeField()),
                ("nombre", models.PositiveIntegerField(default=1)),
                ("statut", models.CharField(choices=[("confirmee", "Confirmée"), ("annulee", "Annulée")], default="confirmee", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("arrivee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="arrivees", to="mobilite.station")),
                ("depart", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="departs", to="mobilite.station")),
                ("transport", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reservations", to="mobilite.transport")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reservations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-date_depart"]},
        ),
    ]
