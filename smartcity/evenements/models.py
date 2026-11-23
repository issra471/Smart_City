from django.conf import settings
from django.db import models
from django.utils import timezone


class Evenement(models.Model):
    CATEGORIES = [
        ("culture", "Culture & spectacles"),
        ("sport", "Sport & bien-être"),
        ("nature", "Nature & environnement"),
        ("marche", "Marchés & brocantes"),
        ("atelier", "Ateliers & formations"),
        ("autre", "Autre"),
    ]

    organisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="evenements")
    titre = models.CharField(max_length=150)
    description = models.TextField()
    categorie = models.CharField(max_length=20, choices=CATEGORIES, default="autre")
    lieu = models.CharField(max_length=150)
    adresse = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    date = models.DateTimeField()
    date_fin = models.DateTimeField(null=True, blank=True, help_text="Facultatif. Si vide, durée estimée à 2 h.")
    image = models.ImageField(upload_to="evenements/", blank=True)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="participations")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return self.titre

    # --- statut calculé ---
    @property
    def statut(self):
        now = timezone.now()
        fin = self.date_fin or (self.date + timezone.timedelta(hours=2))
        if now < self.date:
            return "avenir"
        if now <= fin:
            return "en_cours"
        return "passe"

    STATUT_LABELS = {"avenir": "À venir", "en_cours": "En cours", "Passé": "passe"}

    @property
    def statut_label(self):
        return {"avenir": "À venir", "en_cours": "En cours", "passe": "Passé"}[self.statut]

    @property
    def nb_participants(self):
        return self.participants.count()

    def modifiable_par(self, user):
        return user == self.organisateur and self.statut == "avenir"

    def supprimable_par(self, user):
        return self.modifiable_par(user) or user.is_staff

    # --- cartes génériques (Module/List) ---
    @property
    def card_image(self):
        return self.image.url if self.image else None

    @property
    def card_title(self):
        return self.titre

    @property
    def card_meta(self):
        return f"{self.date:%d/%m/%Y %H:%M} · {self.lieu}"

    @property
    def card_text(self):
        return self.description
