from django.urls import path
from . import views

app_name = "marketplace"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),
    path("<int:pk>/", views.ItemDetail.as_view(), name="detail"),
    path("<int:pk>/modifier/", views.ItemUpdate.as_view(), name="update"),
    path("<int:pk>/supprimer/", views.supprimer, name="delete"),
    path("<int:pk>/vendu/", views.mark_sold, name="mark_sold"),
    path("<int:pk>/ajouter-panier/", views.add_to_cart, name="add_to_cart"),
    path("panier/", views.PanierView.as_view(), name="panier"),
    path("panier/retirer/<int:item_pk>/", views.retirer_du_panier, name="retirer_du_panier"),
    path("panier/modifier/<int:item_pk>/", views.modifier_quantite, name="modifier_quantite"),
    path("panier/commander/", views.passer_commande, name="passer_commande"),
    path("gestion/", views.AdminMarketplace.as_view(), name="admin"),
    path("gestion/<int:pk>/retirer/", views.retirer, name="retirer"),
]
