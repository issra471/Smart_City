from django.conf import settings
from django.db import models


class Produit(models.Model):
    vendeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="produits")
    titre = models.CharField(max_length=150)
    description = models.TextField()
    prix = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to="produits/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

    @property
    def card_image(self): return self.image.url if self.image else None
    @property
    def card_title(self): return self.titre
    @property
    def card_meta(self): return f"{self.prix} DT · {self.vendeur.username}"
    @property
    def card_text(self): return self.description
