from django.contrib import admin
from .models import Signalement

@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ("titre", "categorie", "statut", "user", "created_at")
    list_filter = ("categorie", "statut")
