from django.conf import settings
from django.db import models


class Produit(models.Model):
    CATEGORIES = [
        ("alimentaire", "Alimentaire"),
        ("artisanat", "Artisanat"),
        ("vetements", "Vêtements"),
        ("services", "Services"),
        ("autre", "Autre"),
    ]
    STATUTS = [
        ("disponible", "Disponible"),
        ("vendu", "Vendu"),
        ("retire", "Retiré"),
    ]

    vendeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="produits")
    titre = models.CharField(max_length=150)
    description = models.TextField()
    categorie = models.CharField(max_length=20, choices=CATEGORIES, default="autre")
    prix = models.DecimalField(max_digits=8, decimal_places=2)
    statut = models.CharField(max_length=12, choices=STATUTS, default="disponible")
    telephone = models.CharField("Téléphone de contact", max_length=20, blank=True)
    image = models.ImageField(upload_to="produits/", blank=True)
    motif_retrait = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

    def modifiable_par(self, user):
        return user == self.vendeur and self.statut != "retire"

    def supprimable_par(self, user):
        return self.modifiable_par(user) or user.is_staff

    @property
    def card_image(self):
        return self.image.url if self.image else None

    @property
    def card_title(self):
        return self.titre

    @property
    def card_meta(self):
        return f"{self.prix} DT · {self.vendeur.username}"

    @property
    def card_text(self):
        return self.description
