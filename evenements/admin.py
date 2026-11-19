from django.contrib import admin
from .models import Evenement


@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display = ("titre", "organisateur", "lieu", "date", "nb_participants", "created_at")
    list_filter = ("date", "created_at")
    search_fields = ("titre", "description", "lieu", "organisateur__username")
    filter_horizontal = ("participants",)
    date_hierarchy = "date"

    def nb_participants(self, obj):
        return obj.participants.count()
    nb_participants.short_description = "Participants"
