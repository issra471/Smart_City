from django.utils import timezone

from core.inertia_utils import display_name, iso
from core.views import ModuleCreateView, ModuleListView
from .models import Evenement


class ItemList(ModuleListView):
    queryset = Evenement.objects.select_related("organisateur")
    title = "Sortir à My City"
    subtitle = "Culture, nature, rencontres."
    app_ns = "evenements"
    add_label = "Créer un événement"
    filters = [("avenir", "À venir"), ("passe", "Passés")]

    def serialize(self, o):
        return {
            **super().serialize(o),
            "place": o.lieu,
            "event_date": iso(o.date),
            "author": display_name(o.organisateur),
            "filter": "avenir" if o.date >= timezone.now() else "passe",
        }


class ItemCreate(ModuleCreateView):
    model = Evenement
    fields = ["titre", "description", "lieu", "date", "image"]
    title = "Créer un événement"
    intro = "Concert, marché, balade, atelier… Donnez envie aux habitants de venir."
    app_ns = "evenements"
    owner_field = "organisateur"
    success_message = "Événement publié."
