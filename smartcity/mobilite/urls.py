from django.urls import path
from . import views

app_name = "mobilite"
urlpatterns = [
    path("", views.ItemList.as_view(), name="list"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),  # station : administrateur seulement
    path("transports/proposer/", views.TransportCreate.as_view(), name="transport_create"),
    path("mes-reservations/", views.MesReservations.as_view(), name="reservations"),
    path("reservation/<int:pk>/annuler/", views.annuler, name="annuler"),
    path("gestion/transports/", views.AdminTransports.as_view(), name="admin_transports"),
    path("gestion/transports/<int:pk>/decision/", views.decider, name="transport_decide"),
]
