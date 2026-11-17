from django.urls import path
from . import views

app_name = "marketplace"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),
    # Mes produits (espace vendeur)
    path("mes-produits/", views.MesProduits.as_view(), name="mes_produits"),
    path("produit/<int:pk>/modifier/", views.ProduitModifier.as_view(), name="produit_modifier"),
    path("produit/<int:pk>/supprimer/", views.produit_supprimer, name="produit_supprimer"),
    # Panier
    path("panier/", views.MonPanier.as_view(), name="mon_panier"),
    path("panier/ajouter/<int:pk>/", views.panier_ajouter, name="panier_ajouter"),
    path("panier/supprimer/<int:pk>/", views.panier_supprimer, name="panier_supprimer"),
    path("panier/vider/", views.panier_vider, name="panier_vider"),
    path("panier/commander/", views.passer_commande, name="passer_commande"),
]
