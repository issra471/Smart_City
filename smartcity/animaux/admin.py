from django.contrib import admin
from .models import Observation, Partenaire, SuiviAnimal


class SuiviInline(admin.TabularInline):
    model = SuiviAnimal
    extra = 0


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("titre", "cas", "animal", "statut", "priorite", "partenaire", "user", "created_at")
    list_filter = ("cas", "animal", "statut", "priorite")
    inlines = [SuiviInline]


@admin.register(Partenaire)
class PartenaireAdmin(admin.ModelAdmin):
    list_display = ("nom", "responsable", "telephone")
