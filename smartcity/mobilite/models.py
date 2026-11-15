from django.conf import settings
from django.db import models


class Station(models.Model):
    """Un lieu de la ville (La Marsa, Gammarth...) qui contient des transports. Créée par un administrateur."""

    nom = models.CharField("Nom de la station", max_length=120)
    adresse = models.CharField("Adresse ou repère", max_length=200, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Transport(models.Model):
    """Des transports d'un même type dans une station. Proposés par un citoyen, approuvés par un administrateur."""

    TYPES = [("velo", "Vélo"), ("trottinette", "Trottinette"), ("scooter", "Scooter électrique"), ("bus", "Bus électrique")]
    TYPES_ADMIN = {"bus"}  # types que seul un administrateur peut ajouter
    STATUTS = [("en_attente", "En attente"), ("approuve", "Approuvé"), ("refuse", "Refusé")]

    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="transports")
    type = models.CharField("Type de transport", max_length=20, choices=TYPES)
    unites_disponibles = models.PositiveIntegerField("Nombre d'unités", default=1)
    propose_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="transports_proposes")
    statut = models.CharField(max_length=20, choices=STATUTS, default="en_attente")
    # Approuvé alors que la station avait déjà ce type : ses unités ont été ajoutées au stock existant.
    fusionne = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def stock(cls):
        """Transports réservables (une seule ligne par station et par type)."""
        return cls.objects.filter(statut="approuve", fusionne=False)

    def approuver(self):
        """Approuve ; si la station a déjà ce type, ajoute les unités au stock existant."""
        existant = Transport.stock().filter(station=self.station_id, type=self.type).exclude(pk=self.pk).first()
        if existant:
            Transport.objects.filter(pk=existant.pk).update(unites_disponibles=models.F("unites_disponibles") + self.unites_disponibles)
            self.fusionne = True
        self.statut = "approuve"
        self.save()

    def __str__(self):
        return f"{self.get_type_display()} · {self.station}"


class Reservation(models.Model):
    """Une balade : d'une station de départ vers une autre station, avec un transport de la station de départ."""

    STATUTS = [("confirmee", "Confirmée"), ("annulee", "Annulée")]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    depart = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="departs")
    arrivee = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="arrivees")
    transport = models.ForeignKey(Transport, on_delete=models.CASCADE, related_name="reservations")
    date_depart = models.DateTimeField()
    nombre = models.PositiveIntegerField(default=1)
    statut = models.CharField(max_length=20, choices=STATUTS, default="confirmee")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_depart"]

    def __str__(self):
        return f"{self.user} : {self.depart} → {self.arrivee} ({self.date_depart:%d/%m/%Y %H:%M})"
