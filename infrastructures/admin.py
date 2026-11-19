from django.contrib import admin
from .models import Signalement, Suivi


class SuiviInline(admin.TabularInline):
    model = Suivi
    extra = 0


@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ("titre", "categorie", "statut", "priorite", "user", "created_at")
    list_filter = ("categorie", "statut", "priorite")
    inlines = [SuiviInline]
