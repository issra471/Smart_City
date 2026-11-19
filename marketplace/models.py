from decimal import Decimal
from django.conf import settings
from django.db import models


class Produit(models.Model):
    UNITES = [
        ("piece", "pièce(s)"),
        ("kg", "kg"),
        ("litre", "litre(s)"),
        ("lot", "lot(s)"),
        ("botte", "botte(s)"),
        ("gramme", "g"),
    ]

    vendeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="produits")
    titre = models.CharField("Titre du produit", max_length=150)
    description = models.TextField("Description")
    prix = models.DecimalField("Prix unitaire (DT)", max_digits=8, decimal_places=2)
    quantite = models.DecimalField("Quantité disponible", max_digits=8, decimal_places=2, default=Decimal("1.00"))
    unite = models.CharField("Unité", max_length=20, choices=UNITES, default="piece")
    disponible = models.BooleanField("Disponible à la vente", default=True)
    image = models.ImageField("Photo du produit", upload_to="produits/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.titre} ({self.formatted_quantite} {self.get_unite_display()})"

    @property
    def formatted_quantite(self):
        if self.quantite is None:
            return "0"
        val = self.quantite
        if val == val.to_integral():
            return str(int(val))
        return str(val.normalize())

    @property
    def card_image(self):
        return self.image.url if self.image else None

    @property
    def card_title(self):
        return self.titre

    @property
    def card_meta(self):
        return f"{self.prix} DT · {self.formatted_quantite} {self.get_unite_display()} · {self.vendeur.username}"

    @property
    def card_text(self):
        return self.description


class PanierItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="panier_items")
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name="dans_paniers")
    quantite = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("1.00"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("user", "produit")

    def __str__(self):
        return f"{self.quantite} x {self.produit.titre} pour {self.user.username}"

    @property
    def sous_total(self):
        return self.produit.prix * self.quantite


class Commande(models.Model):
    STATUTS = [
        ("confirmee", "Confirmée"),
        ("en_cours", "En cours de préparation"),
        ("prete", "Prête"),
        ("livree", "Livrée"),
        ("annulee", "Annulée"),
    ]

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commandes")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    statut = models.CharField(max_length=20, choices=STATUTS, default="confirmee")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Commande #{self.pk} par {self.client.username} ({self.total} DT)"


class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name="lignes")
    produit = models.ForeignKey(Produit, on_delete=models.SET_NULL, null=True, blank=True)
    titre_produit = models.CharField(max_length=150)
    prix_unitaire = models.DecimalField(max_digits=8, decimal_places=2)
    quantite = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("1.00"))
    unite = models.CharField(max_length=20, default="piece")
    sous_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    def __str__(self):
        return f"{self.quantite} {self.unite} - {self.titre_produit}"
