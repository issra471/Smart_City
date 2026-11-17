from django.conf import settings
from django.db import models


UNITES = [
    ('piece', 'Pièce'),
    ('kg', 'Kilogramme (kg)'),
    ('g', 'Gramme (g)'),
    ('litre', 'Litre (L)'),
    ('cl', 'Centilitre (cl)'),
    ('boite', 'Boîte'),
    ('sachet', 'Sachet'),
    ('botte', 'Botte'),
]


class Produit(models.Model):
    vendeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="produits")
    titre = models.CharField(max_length=150)
    description = models.TextField()
    prix = models.DecimalField(max_digits=8, decimal_places=2)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, default=1, verbose_name="Quantité")
    unite = models.CharField(max_length=20, choices=UNITES, default='piece', verbose_name="Unité")
    image = models.ImageField(upload_to="produits/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

    def get_unite_display_short(self):
        mapping = {
            'piece': 'pcs', 'kg': 'kg', 'g': 'g',
            'litre': 'L', 'cl': 'cl', 'boite': 'boîte',
            'sachet': 'sachet', 'botte': 'botte',
        }
        return mapping.get(self.unite, self.unite)

    @property
    def card_image(self): return self.image.url if self.image else None
    @property
    def card_title(self): return self.titre
    @property
    def card_meta(self): return f"{self.prix} DT · {self.vendeur.username}"
    @property
    def card_text(self): return self.description


class PanierItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="panier_items")
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name="panier_items")
    quantite = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'produit')]
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user} - {self.produit}"

    @property
    def total(self):
        return self.quantite * self.produit.prix
