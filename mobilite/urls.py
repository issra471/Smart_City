from django.urls import path
from . import views

app_name = "mobilite"
urlpatterns = [
    # Citoyens
    path("", views.ItemList.as_view(), name="list"),
    path("transports/proposer/", views.TransportCreate.as_view(), name="transport_create"),
    path("mes-reservations/", views.MesReservations.as_view(), name="reservations"),
    path("reservation/<int:pk>/annuler/", views.annuler, name="annuler"),
    # Administration
    path("gestion/", views.AdminMobilite.as_view(), name="admin"),
    path("nouveau/", views.ItemCreate.as_view(), name="create"),  # nouvelle station
    path("gestion/stations/<int:pk>/", views.AdminStation.as_view(), name="admin_station"),
    path("gestion/stations/<int:pk>/modifier/", views.StationUpdate.as_view(), name="station_update"),
    path("gestion/stations/<int:pk>/supprimer/", views.station_supprimer, name="station_delete"),
    path("gestion/stock/<int:pk>/", views.stock_update, name="stock_update"),
    path("gestion/reservations/", views.AdminReservations.as_view(), name="admin_reservations"),
    path("gestion/reservations/<int:pk>/annuler/", views.admin_annuler, name="admin_annuler"),
    path("gestion/transports/", views.AdminTransports.as_view(), name="admin_transports"),
    path("gestion/transports/<int:pk>/decision/", views.decider, name="transport_decide"),
]
