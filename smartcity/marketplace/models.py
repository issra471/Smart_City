from decimal import Decimal

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
    UNITES = [
        ("piece", "Pièce"),
        ("kg", "Kg"),
        ("litre", "Litre"),
        ("g", "Gramme"),
        ("m", "Mètre"),
        ("lot", "Lot"),
    ]

    vendeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="produits")
    titre = models.CharField(max_length=150)
    description = models.TextField()
    categorie = models.CharField(max_length=20, choices=CATEGORIES, default="autre")
    prix = models.DecimalField(max_digits=8, decimal_places=2)
    quantite = models.PositiveIntegerField("Quantité disponible", default=1)
    unite = models.CharField("Unité", max_length=10, choices=UNITES, default="piece")
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
    def en_rupture(self):
        return self.quantite == 0

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


class Panier(models.Model):
    """Panier d'un citoyen : un seul panier actif par utilisateur."""
    citoyen = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="panier")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Panier de {self.citoyen}"

    def total(self):
        return sum((item.sous_total() for item in self.items.select_related("produit").all()), Decimal("0.00"))

    def vider(self):
        self.items.all().delete()


class PanierItem(models.Model):
    """Un produit dans le panier avec la quantité souhaitée."""
    panier = models.ForeignKey(Panier, on_delete=models.CASCADE, related_name="items")
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name="panier_items")
    quantite = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = [("panier", "produit")]

    def __str__(self):
        return f"{self.quantite}× {self.produit.titre}"

    def sous_total(self):
        return self.quantite * self.produit.prix
