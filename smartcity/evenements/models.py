from django.conf import settings
from django.db import models


class Evenement(models.Model):
    organisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="evenements")
    titre = models.CharField(max_length=150)
    description = models.TextField()
    lieu = models.CharField(max_length=150)
    date = models.DateTimeField()
    image = models.ImageField(upload_to="evenements/", blank=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return self.titre

    @property
    def card_image(self): return self.image.url if self.image else None
    @property
    def card_title(self): return self.titre
    @property
    def card_meta(self): return f"{self.date:%d/%m/%Y %H:%M} · {self.lieu}"
    @property
    def card_text(self): return self.description
