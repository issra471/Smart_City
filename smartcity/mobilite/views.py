from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, ListView

from core.inertia_utils import InertiaFormMixin, InertiaMixin, iso
from core.views import ModuleCreateView
from .forms import ReservationForm
from .models import Reservation, Station


def station_payload(s):
    return {
        "id": s.pk,
        "name": s.nom,
        "type": s.type,
        "type_label": s.get_type_display(),
        "address": s.adresse,
        "units": s.unites_disponibles,
        "reserve_url": reverse("mobilite:reserver", args=[s.pk]),
    }


class ItemList(InertiaMixin, ListView):
    """Stations de mobilité (frontend/pages/Mobilite/Stations.jsx). Le filtre par type se fait côté React."""

    model = Station
    component = "Mobilite/Stations"

    def get_props(self, context):
        return {
            "stations": [station_payload(s) for s in context["object_list"]],
            "types": [{"value": v, "label": label} for v, label in Station.TYPES],
            "current_type": self.request.GET.get("type", ""),
        }


class ItemCreate(ModuleCreateView):
    model = Station
    fields = ["nom", "type", "adresse", "unites_disponibles"]
    title = "Ajouter une station"
    intro = "Vélos, trottinettes, bus électriques ou covoiturage : indiquez l'emplacement et le nombre d'unités."
    app_ns = "mobilite"
    owner_field = None
    success_message = "Station ajoutée."


class ReserverView(LoginRequiredMixin, InertiaFormMixin, CreateView):
    model = Reservation
    form_class = ReservationForm
    component = "Mobilite/Reserver"
    success_url = reverse_lazy("mobilite:reservations")

    def dispatch(self, request, *args, **kwargs):
        self.station = get_object_or_404(Station, pk=kwargs["pk"])
        return super().dispatch(request, *args, **kwargs)

    def get_props(self, context):
        return {**super().get_props(context), "station": station_payload(self.station)}

    def form_valid(self, form):
        with transaction.atomic():
            station = Station.objects.select_for_update().get(pk=self.station.pk)
            n = form.cleaned_data["nombre"]
            if n > station.unites_disponibles:
                form.add_error("nombre", f"Seulement {station.unites_disponibles} unité(s) disponible(s).")
                return self.form_invalid(form)
            station.unites_disponibles -= n
            station.save()
            form.instance.user = self.request.user
            form.instance.station = station
            response = super().form_valid(form)
        messages.success(self.request, "Réservation confirmée.")
        return response


class MesReservations(LoginRequiredMixin, InertiaMixin, ListView):
    component = "Mobilite/Reservations"

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related("station")

    def get_props(self, context):
        now = timezone.now()
        return {
            "reservations": [
                {
                    "id": r.pk,
                    "station": r.station.nom,
                    "type": r.station.type,
                    "type_label": r.station.get_type_display(),
                    "address": r.station.adresse,
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
            Station.objects.filter(pk=r.station_id).update(
                unites_disponibles=r.station.unites_disponibles + r.nombre
            )
            messages.success(request, "Réservation annulée.")
    return redirect("mobilite:reservations")
