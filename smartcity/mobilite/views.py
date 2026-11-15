"""Mobilité.

- Une station est un lieu de la ville qui contient des transports. Seul un administrateur en ajoute.
- Un citoyen peut proposer des transports dans une station ; un administrateur approuve ou refuse.
- Une balade (réservation) part d'une station et arrive dans une AUTRE station.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.db import transaction
from django.db.models import F, Prefetch
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, ListView

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso
from core.views import ModuleCreateView
from .forms import ReservationForm, StationForm, TransportForm
from .models import Reservation, Station, Transport

APPROUVES = Prefetch("transports", queryset=Transport.stock().order_by("type"), to_attr="approuves")


def station_payload(s):
    transports = [
        {"id": t.pk, "type": t.type, "type_label": t.get_type_display(), "units": t.unites_disponibles}
        for t in s.approuves
    ]
    return {
        "id": s.pk,
        "name": s.nom,
        "address": s.adresse,
        "lat": s.latitude,
        "lng": s.longitude,
        "transports": transports,
        "units": sum(t["units"] for t in transports),
    }


def proposal_payload(t):
    return {
        "id": t.pk,
        "station": t.station.nom,
        "type": t.type,
        "type_label": t.get_type_display(),
        "units": t.unites_disponibles,
        "status": t.statut,
        "status_label": t.get_statut_display(),
        "author": display_name(t.propose_par) if t.propose_par else "—",
        "date": iso(t.created_at),
    }


class ItemList(InertiaFormMixin, CreateView):
    """Carte des stations + réservation d'une balade (frontend/pages/Mobilite/Stations.jsx).

    La page est publique ; il faut être connecté pour envoyer une réservation.
    """

    model = Reservation
    form_class = ReservationForm
    component = "Mobilite/Stations"
    success_url = reverse_lazy("mobilite:reservations")

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        return super().post(request, *args, **kwargs)

    def get_props(self, context):
        user = self.request.user
        mine = Transport.objects.filter(propose_par=user).select_related("station")[:6] if user.is_authenticated else []
        return {
            **super().get_props(context),
            "stations": [station_payload(s) for s in Station.objects.prefetch_related(APPROUVES)],
            "types": [{"value": v, "label": label} for v, label in Transport.TYPES],
            "proposals": [proposal_payload(t) for t in mine],
            "propose_url": reverse("mobilite:transport_create"),
            "pending": Transport.objects.filter(statut="en_attente").count() if user.is_staff else 0,
        }

    def form_valid(self, form):
        with transaction.atomic():
            transport = Transport.objects.select_for_update().get(pk=form.cleaned_data["transport"].pk)
            n = form.cleaned_data["nombre"]
            if transport.statut != "approuve" or transport.fusionne or n > transport.unites_disponibles:
                form.add_error("nombre", f"Seulement {transport.unites_disponibles} unité(s) disponible(s).")
                return self.form_invalid(form)
            transport.unites_disponibles -= n
            transport.save()
            form.instance.user = self.request.user
            response = super().form_valid(form)
        messages.success(self.request, "Balade réservée. Bonne route !")
        return response


class ItemCreate(StaffRequiredMixin, InertiaFormMixin, CreateView):
    """Ajouter une station : réservé aux administrateurs (frontend/pages/Mobilite/StationForm.jsx)."""

    model = Station
    form_class = StationForm
    component = "Mobilite/StationForm"
    success_url = reverse_lazy("mobilite:list")

    def get_props(self, context):
        return {
            **super().get_props(context),
            "stations": [{"id": s.pk, "name": s.nom, "lat": s.latitude, "lng": s.longitude} for s in Station.objects.all()],
        }

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Station ajoutée.")
        return response


class TransportCreate(ModuleCreateView):
    """Un citoyen propose des transports dans une station. Un administrateur doit approuver."""

    model = Transport
    form_class = TransportForm
    title = "Proposer un transport"
    intro = "Choisissez la station, le type de transport et le nombre d'unités. Un administrateur validera votre proposition."
    app_ns = "mobilite"
    owner_field = "propose_par"

    def get_form_kwargs(self):
        return {**super().get_form_kwargs(), "user": self.request.user}

    def form_valid(self, form):
        if not self.request.user.is_staff:
            self.success_message = "Proposition envoyée. Un administrateur doit l'approuver."
            return super().form_valid(form)
        # Un administrateur n'a pas besoin d'approbation.
        self.success_message = "Transport ajouté à la station."
        response = super().form_valid(form)
        self.object.approuver()
        return response


class MesReservations(LoginRequiredMixin, InertiaMixin, ListView):
    component = "Mobilite/Reservations"

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related("depart", "arrivee", "transport")

    def get_props(self, context):
        now = timezone.now()
        return {
            "reservations": [
                {
                    "id": r.pk,
                    "from": r.depart.nom,
                    "to": r.arrivee.nom,
                    "type": r.transport.type,
                    "type_label": r.transport.get_type_display(),
                    "units": r.nombre,
                    "date": iso(r.date_depart),
                    "status": r.statut,
                    "status_label": r.get_statut_display(),
                    "upcoming": r.statut == "confirmee" and r.date_depart >= now,
                    "cancel_url": reverse("mobilite:annuler", args=[r.pk]),
                }
                for r in context["object_list"]
            ]
        }


@login_required
@require_POST
def annuler(request, pk):
    with transaction.atomic():
        r = get_object_or_404(Reservation.objects.select_for_update(), pk=pk, user=request.user)
        if r.statut == "confirmee":
            r.statut = "annulee"
            r.save()
            # Les unités reviennent dans le stock de la station (la ligne d'origine a pu être fusionnée).
            t = r.transport
            stock = t if not t.fusionne else Transport.stock().filter(station=t.station_id, type=t.type).first() or t
            Transport.objects.filter(pk=stock.pk).update(unites_disponibles=F("unites_disponibles") + r.nombre)
            messages.success(request, "Réservation annulée.")
    return redirect("mobilite:reservations")


class AdminTransports(StaffRequiredMixin, InertiaMixin, ListView):
    """Propositions de transports à approuver (frontend/pages/Admin/Transports.jsx)."""

    component = "Admin/Transports"
    queryset = Transport.objects.select_related("station", "propose_par")

    def get_props(self, context):
        rows = [
            {**proposal_payload(t), "decide_url": reverse("mobilite:transport_decide", args=[t.pk])}
            for t in context["object_list"]
        ]
        rows.sort(key=lambda r: r["status"] != "en_attente")  # en attente d'abord
        return {"rows": rows, "station_create_url": reverse("mobilite:create")}


@require_POST
@user_passes_test(lambda u: u.is_staff, login_url="accounts:login")
def decider(request, pk):
    transport = get_object_or_404(Transport, pk=pk)
    decision = request.POST.get("decision")
    if transport.statut == "en_attente" and decision in ("approuve", "refuse"):
        if decision == "approuve":
            transport.approuver()
        else:
            transport.statut = "refuse"
            transport.save()
        messages.success(request, "Transport approuvé : il est maintenant réservable." if decision == "approuve" else "Proposition refusée.")
    return redirect("mobilite:admin_transports")
