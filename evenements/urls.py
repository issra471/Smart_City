from django.urls import path
from . import views

app_name = "evenements"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),
    path("<int:pk>/", views.ItemDetail.as_view(), name="detail"),
    path("<int:pk>/modifier/", views.ItemUpdate.as_view(), name="update"),
    path("<int:pk>/supprimer/", views.item_delete, name="delete"),
    path("<int:pk>/participer/", views.evenement_participer, name="participer"),
]
