from core.inertia_utils import display_name, iso
from core.views import ModuleCreateView, ModuleListView
from .models import Produit


class ItemList(ModuleListView):
    queryset = Produit.objects.select_related("vendeur")
    title = "Acheter local"
    subtitle = "Les produits du marché local."
    app_ns = "marketplace"
    add_label = "Publier un produit"

    def serialize(self, o):
        return {
            **super().serialize(o),
            "price": str(o.prix),
            "date": iso(o.created_at),
            "author": display_name(o.vendeur),
        }


class ItemCreate(ModuleCreateView):
    model = Produit
    fields = ["titre", "description", "prix", "image"]
    title = "Publier un produit"
    intro = "Présentez votre produit avec une belle photo et un prix clair."
    app_ns = "marketplace"
    owner_field = "vendeur"
    success_message = "Produit publié sur le marché local."
