from django.conf import settings
from django.db import models


class Observation(models.Model):
    TYPES = [("observation", "Observation"), ("soin", "Besoin de soin")]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="observations")
    espece = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPES, default="observation")
    description = models.TextField(blank=True)
    lieu = models.CharField(max_length=150)
    photo = models.ImageField(upload_to="animaux/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.espece} - {self.lieu}"

    @property
    def card_image(self): return self.photo.url if self.photo else None
    @property
    def card_title(self): return self.espece
    @property
    def card_meta(self): return f"{self.get_type_display()} · {self.lieu}"
    @property
    def card_text(self): return self.description
