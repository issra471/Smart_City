from django.contrib import admin
from .models import Commande, LigneCommande, PanierItem, Produit


class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ("titre", "vendeur", "prix", "quantite", "unite", "disponible", "created_at")
    list_filter = ("disponible", "unite", "created_at")
    search_fields = ("titre", "description", "vendeur__username")


@admin.register(PanierItem)
class PanierItemAdmin(admin.ModelAdmin):
    list_display = ("user", "produit", "quantite", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "produit__titre")


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "total", "statut", "created_at")
    list_filter = ("statut", "created_at")
    search_fields = ("client__username",)
    inlines = [LigneCommandeInline]
