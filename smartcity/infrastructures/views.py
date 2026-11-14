from core.inertia_utils import display_name, iso
from core.views import ModuleCreateView, ModuleListView
from .models import Signalement


class ItemList(ModuleListView):
    queryset = Signalement.objects.select_related("user")
    title = "Signaler un problème"
    subtitle = "Voirie, éclairage, mobilier : suivez les signalements."
    app_ns = "infrastructures"
    add_label = "Nouveau signalement"
    filters = Signalement.STATUTS

    def serialize(self, o):
        return {
            **super().serialize(o),
            "tag": o.get_categorie_display(),
            "status": {"key": o.statut, "label": o.get_statut_display()},
            "place": o.adresse,
            "date": iso(o.created_at),
            "author": display_name(o.user),
            "filter": o.statut,
        }


class ItemCreate(ModuleCreateView):
    model = Signalement
    fields = ["titre", "categorie", "description", "adresse", "photo"]
    title = "Nouveau signalement"
    intro = "Décrivez le problème et indiquez où il se trouve. Une photo aide les équipes à intervenir plus vite."
    app_ns = "infrastructures"
    success_message = "Signalement envoyé. Merci, il sera suivi par les équipes."
