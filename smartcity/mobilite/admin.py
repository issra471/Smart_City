from django.contrib import admin
from .models import Reservation, Station


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("nom", "type", "adresse", "unites_disponibles")
    list_filter = ("type",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("user", "station", "date_depart", "nombre", "statut")
    list_filter = ("statut",)
