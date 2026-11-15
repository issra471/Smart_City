from django.contrib import admin
from .models import Reservation, Station, Transport


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("nom", "adresse", "latitude", "longitude")


@admin.register(Transport)
class TransportAdmin(admin.ModelAdmin):
    list_display = ("station", "type", "unites_disponibles", "statut", "propose_par")
    list_filter = ("statut", "type")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("user", "depart", "arrivee", "transport", "date_depart", "nombre", "statut")
    list_filter = ("statut",)
