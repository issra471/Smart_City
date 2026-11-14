from core.inertia_utils import display_name, iso
from core.views import ModuleCreateView, ModuleListView
from .models import Observation


class ItemList(ModuleListView):
    queryset = Observation.objects.select_related("user")
    title = "Observer un animal"
    subtitle = "Observations et prises en charge rapides."
    app_ns = "animaux"
    add_label = "Signaler un animal"
    filters = Observation.TYPES

    def serialize(self, o):
        return {
            **super().serialize(o),
            "tag": o.get_type_display(),
            "alert": o.type == "soin",
            "place": o.lieu,
            "date": iso(o.created_at),
            "author": display_name(o.user),
            "filter": o.type,
        }


class ItemCreate(ModuleCreateView):
    model = Observation
    fields = ["espece", "type", "description", "lieu", "photo"]
    title = "Signaler un animal"
    intro = "Un oiseau rare, un hérisson, un animal blessé ? Indiquez l'espèce et le lieu."
    app_ns = "animaux"
    success_message = "Observation enregistrée. Merci !"
