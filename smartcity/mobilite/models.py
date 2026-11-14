from django.conf import settings
from django.db import models


class Station(models.Model):
    TYPES = [("velo", "Vélo"), ("trottinette", "Trottinette"), ("bus", "Bus électrique"), ("covoiturage", "Covoiturage")]
    nom = models.CharField(max_length=120)
    type = models.CharField(max_length=20, choices=TYPES)
    adresse = models.CharField(max_length=200, blank=True)
    unites_disponibles = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.get_type_display()})"


class Reservation(models.Model):
    STATUTS = [("confirmee", "Confirmée"), ("annulee", "Annulée")]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="reservations")
    date_depart = models.DateTimeField()
    nombre = models.PositiveIntegerField(default=1)
    statut = models.CharField(max_length=20, choices=STATUTS, default="confirmee")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_depart"]

    def __str__(self):
        return f"{self.user} → {self.station} ({self.date_depart:%d/%m/%Y %H:%M})"
