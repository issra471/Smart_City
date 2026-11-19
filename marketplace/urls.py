from django.urls import path
from . import views

app_name = "marketplace"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),
    path("mes-produits/", views.MesProduitsView.as_view(), name="mes_produits"),
    path("<int:pk>/modifier/", views.ItemUpdate.as_view(), name="update"),
    path("<int:pk>/supprimer/", views.item_delete, name="delete"),
    # Panier & commandes
    path("panier/", views.PanierView.as_view(), name="panier"),
    path("panier/ajouter/<int:pk>/", views.panier_ajouter, name="panier_ajouter"),
    path("panier/modifier/<int:pk>/", views.panier_modifier, name="panier_modifier"),
    path("panier/supprimer/<int:pk>/", views.panier_supprimer, name="panier_supprimer"),
    path("panier/vider/", views.panier_vider, name="panier_vider"),
    path("panier/commander/", views.panier_commander, name="panier_commander"),
]
