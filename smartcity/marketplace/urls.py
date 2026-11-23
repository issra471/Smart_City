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
    path("gestion/", views.AdminMarketplace.as_view(), name="admin"),
    path("gestion/<int:pk>/retirer/", views.retirer, name="retirer"),
]
