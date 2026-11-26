from django.contrib import admin
from .models import Panier, PanierItem, Produit

admin.site.register(Produit)
admin.site.register(Panier)
admin.site.register(PanierItem)
