from django.urls import path
from . import views

app_name = "mobilite"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),
    path("station/<int:pk>/reserver/", views.ReserverView.as_view(), name="reserver"),
    path("mes-reservations/", views.MesReservations.as_view(), name="reservations"),
    path("reservation/<int:pk>/annuler/", views.annuler, name="annuler"),
]
