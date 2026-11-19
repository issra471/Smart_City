from django.urls import path
from . import views

app_name = "infrastructures"
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
    path("gestion/", views.AdminReports.as_view(), name="admin"),
    path("gestion/equipes/", views.EquipeList.as_view(), name="equipes"),
    path("gestion/equipes/nouvelle/", views.EquipeCreate.as_view(), name="equipe_create"),
    path("gestion/equipes/<int:pk>/modifier/", views.EquipeUpdate.as_view(), name="equipe_update"),
    path("gestion/equipes/<int:pk>/supprimer/", views.equipe_supprimer, name="equipe_delete"),
]
