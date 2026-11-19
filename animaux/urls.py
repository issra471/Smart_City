from django.urls import path
from . import views

app_name = "animaux"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),
    path("<int:pk>/", views.ItemDetail.as_view(), name="detail"),
    path("<int:pk>/modifier/", views.ItemUpdate.as_view(), name="update"),
    path("<int:pk>/supprimer/", views.supprimer, name="delete"),
    path("<int:pk>/soutenir/", views.soutenir, name="soutenir"),
    # Administration
    path("<int:pk>/gerer/", views.ItemManage.as_view(), name="gerer"),
    path("<int:pk>/rapide/", views.rapide, name="rapide"),
    path("gestion/", views.AdminAnimaux.as_view(), name="admin"),
    path("gestion/partenaires/", views.PartenaireList.as_view(), name="partenaires"),
    path("gestion/partenaires/nouveau/", views.PartenaireCreate.as_view(), name="partenaire_create"),
    path("gestion/partenaires/<int:pk>/modifier/", views.PartenaireUpdate.as_view(), name="partenaire_update"),
    path("gestion/partenaires/<int:pk>/supprimer/", views.partenaire_supprimer, name="partenaire_delete"),
]
