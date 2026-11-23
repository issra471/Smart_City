from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Sum
from django.urls import reverse
from django.utils import timezone
from django.views.generic import CreateView, ListView
from inertia import render as inertia_render

from .inertia_utils import InertiaFormMixin, InertiaMixin, iso

MODULES = [
    {"label": "Me déplacer", "ns": "mobilite", "desc": "Stations, réservations, trajets. Trouvez une station et préparez votre prochain départ."},
    {"label": "Signaler un problème", "ns": "infrastructures", "desc": "Voirie, éclairage, mobilier. Aidez à repérer les problèmes dans l'espace public."},
    {"label": "Sortir à My City", "ns": "evenements", "desc": "Culture, nature, rencontres. Explorez les événements et retrouvez vos inscriptions."},
    {"label": "Aider un animal", "ns": "animaux", "desc": "Animal blessé, errant ou en danger : placez-le sur la carte, un partenaire intervient. Partagez aussi vos observations."},
    {"label": "Acheter local", "ns": "marketplace", "desc": "Produits, commandes. Découvrez les produits proposés par le marché local."},
    {"label": "Mon espace vendeur", "ns": "marketplace", "url": "marketplace:create", "desc": "Mes produits. Gérez vos annonces. Accès préservé à titre de producteur."},
]


def modules_payload():
    return [{**m, "url": reverse(m.get("url") or f"{m['ns']}:list")} for m in MODULES]


def home(request):
    """Page d'accueil en React (frontend/pages/Home.jsx) via Inertia."""
    from animaux.models import Observation
    from evenements.models import Evenement
    from infrastructures.models import Signalement
    from marketplace.models import Produit
    from mobilite.models import Station

    stats = {
        "stations": Station.objects.count(),
        "evenements": Evenement.objects.count(),
        "signalements": Signalement.objects.count(),
        "observations": Observation.objects.count(),
        "produits": Produit.objects.count(),
    }
    return inertia_render(request, "Home", {"modules": modules_payload(), "stats": stats})


@login_required
def dashboard(request):
    """Tableau de bord du citoyen (frontend/pages/Dashboard.jsx)."""
    from animaux.models import Observation
    from evenements.models import Evenement
    from infrastructures.models import Signalement
    from marketplace.models import Produit
    from mobilite.models import Reservation, Station, Transport

    user, now = request.user, timezone.now()
    my_reports = Signalement.objects.filter(user=user)
    next_res = (
        Reservation.objects.filter(user=user, statut="confirmee", date_depart__gte=now)
        .select_related("depart", "arrivee", "transport")
        .order_by("date_depart")
        .first()
    )
    props = {
        "modules": modules_payload(),
        "city": {
            "stations": Station.objects.count(),
            "units": Transport.stock().aggregate(n=Sum("unites_disponibles"))["n"] or 0,
            "events": Evenement.objects.filter(date__gte=now).count(),
            "open_reports": Signalement.objects.exclude(statut="resolu").count(),
            "products": Produit.objects.count(),
        },
        "mine": {
            "reservations": Reservation.objects.filter(user=user, statut="confirmee").count(),
            "reports": my_reports.count(),
            "observations": Observation.objects.filter(user=user).count(),
            "products": Produit.objects.filter(vendeur=user).count(),
        },
        "report_status": [
            {"key": key, "label": label, "count": my_reports.filter(statut=key).count()}
            for key, label in Signalement.STATUTS
        ],
        "next_reservation": next_res
        and {
            "station": f"{next_res.depart.nom} → {next_res.arrivee.nom}",
            "type": next_res.transport.type,
            "type_label": next_res.transport.get_type_display(),
            "units": next_res.nombre,
            "date": iso(next_res.date_depart),
        },
        "events": [
            {"id": e.pk, "title": e.titre, "place": e.lieu, "date": iso(e.date)}
            for e in Evenement.objects.filter(date__gte=now).order_by("date")[:3]
        ],
    }
    return inertia_render(request, "Dashboard", props)


def error_403(request, exception=None):
    response = inertia_render(request, "Error", {"status": 403})
    response.status_code = 403
    return response


def error_404(request, exception=None):
    response = inertia_render(request, "Error", {"status": 404})
    response.status_code = 404
    return response


class ModuleListView(InertiaMixin, ListView):
    """Liste générique utilisée par les modules (frontend/pages/Module/List.jsx)."""

    component = "Module/List"
    title = ""
    subtitle = ""
    app_ns = ""
    add_label = "Ajouter"
    filters = []  # [(valeur, libellé)] : puces de filtre affichées au-dessus de la liste

    def serialize(self, o):
        """Données d'une carte. Les modules ajoutent leurs champs (statut, prix, date...)."""
        return {"id": o.pk, "title": o.card_title, "text": o.card_text, "image": o.card_image}

    def get_props(self, context):
        return {
            "title": self.title,
            "subtitle": self.subtitle,
            "ns": self.app_ns,
            "add_label": self.add_label,
            "create_url": reverse(f"{self.app_ns}:create"),
            "filters": [{"value": v, "label": label} for v, label in self.filters],
            "items": [self.serialize(o) for o in context["object_list"]],
        }


class ModuleCreateView(LoginRequiredMixin, InertiaFormMixin, CreateView):
    """Formulaire générique de création (frontend/pages/Module/Form.jsx)."""

    component = "Module/Form"
    title = ""
    intro = ""
    app_ns = ""
    owner_field = "user"  # None si le modèle n'a pas de propriétaire
    success_message = "C'est enregistré. Merci pour votre contribution !"

    def form_valid(self, form):
        if self.owner_field:
            setattr(form.instance, self.owner_field, self.request.user)
        response = super().form_valid(form)
        messages.success(self.request, self.success_message)
        return response

    def get_success_url(self):
        return reverse(f"{self.app_ns}:list")

    def get_props(self, context):
        return {
            **super().get_props(context),
            "title": self.title,
            "intro": self.intro,
            "ns": self.app_ns,
            "list_url": reverse(f"{self.app_ns}:list"),
        }
