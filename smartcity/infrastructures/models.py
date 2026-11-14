from django.conf import settings
from django.db import models


class Signalement(models.Model):
    CATEGORIES = [("voirie", "Voirie"), ("eclairage", "Éclairage"), ("mobilier", "Mobilier urbain"), ("autre", "Autre")]
    STATUTS = [("ouvert", "Ouvert"), ("en_cours", "En cours"), ("resolu", "Résolu")]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="signalements")
    titre = models.CharField(max_length=150)
    categorie = models.CharField(max_length=20, choices=CATEGORIES)
    description = models.TextField()
    adresse = models.CharField(max_length=200, blank=True)
    photo = models.ImageField(upload_to="signalements/", blank=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default="ouvert")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

    @property
    def card_image(self): return self.photo.url if self.photo else None
    @property
    def card_title(self): return self.titre
    @property
    def card_meta(self): return f"{self.get_categorie_display()} · {self.get_statut_display()}"
    @property
    def card_text(self): return self.description
