"""Mobilité.

- Une station est un lieu de la ville qui contient des transports. Seul un administrateur en ajoute,
  la modifie ou la supprime, et gère son stock (unités, maintenance, retrait d'un type).
- Un citoyen peut proposer des transports dans une station ; un administrateur approuve ou refuse (avec un motif).
- Une balade (réservation) part d'une station et arrive dans une AUTRE station. Seuls les citoyens réservent ;
  l'administration consulte toutes les réservations et peut en annuler une en donnant un motif.
"""
from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Count, Prefetch, Q, Sum
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, TemplateView, UpdateView

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso
from core.views import ModuleCreateView
from .forms import ReservationForm, StationForm, TransportForm
from .models import Reservation, Station, Transport

APPROUVES = Prefetch("transports", queryset=Transport.stock().order_by("type"), to_attr="approuves")


def staff_required(view):
    """Vue réservée à l'administration (403 pour un citoyen connecté)."""

    @login_required
    def wrapper(request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied
        return view(request, *args, **kwargs)

    return wrapper


def level(units):
    """Niveau de stock d'une station : vide, bas ou ok."""
    return "vide" if units == 0 else "bas" if units <= Station.SEUIL_BAS else "ok"


def station_payload(s):
    transports = [
        {"id": t.pk, "type": t.type, "type_label": t.get_type_display(), "units": t.unites_disponibles, "maintenance": t.en_maintenance}
        for t in s.approuves
    ]
    units = sum(t["units"] for t in transports)
    return {
        "id": s.pk,
        "name": s.nom,
        "address": s.adresse,
        "lat": s.latitude,
        "lng": s.longitude,
        "transports": transports,
        "units": units,
        "maintenance": sum(t["maintenance"] for t in transports),
        "level": level(units),
        "manage_url": reverse("mobilite:admin_station", args=[s.pk]),
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
        "reason": t.motif_refus,
        "author": display_name(t.propose_par) if t.propose_par else "—",
        "date": iso(t.created_at),
    }


def reservation_payload(r, now, admin=False):
    data = {
        "id": r.pk,
        "from": r.depart.nom,
        "to": r.arrivee.nom,
        "type": r.transport.type,
        "type_label": r.transport.get_type_display(),
        "units": r.nombre,
        "date": iso(r.date_depart),
        "status": r.statut,
        "status_label": r.get_statut_display(),
        "reason": r.motif_annulation,
        "upcoming": r.statut == "confirmee" and r.date_depart >= now,
    }
    if admin:
        data.update({"user": display_name(r.user), "username": r.user.get_username(), "from_id": r.depart_id, "to_id": r.arrivee_id, "cancel_url": reverse("mobilite:admin_annuler", args=[r.pk])})
    else:
        data["cancel_url"] = reverse("mobilite:annuler", args=[r.pk])
    return data


def stations_with_stock():
    return Station.objects.prefetch_related(APPROUVES)


# ------------------------------------------------------------------ Citoyens


class ItemList(InertiaFormMixin, CreateView):
    """Carte des stations + réservation d'une balade (frontend/pages/Mobilite/Stations.jsx).

    La page est publique ; il faut être connecté (et citoyen) pour réserver.
    """

    model = Reservation
    form_class = ReservationForm
    component = "Mobilite/Stations"
    success_url = reverse_lazy("mobilite:reservations")

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        if request.user.is_staff:  # l'administration gère les balades, elle n'en réserve pas
            raise PermissionDenied
        return super().post(request, *args, **kwargs)

    def get_props(self, context):
        user = self.request.user
        mine = Transport.objects.filter(propose_par=user).select_related("station")[:6] if user.is_authenticated and not user.is_staff else []
        return {
            **super().get_props(context),
            "stations": [station_payload(s) for s in stations_with_stock()],
            "types": [{"value": v, "label": label} for v, label in Transport.TYPES],
            "proposals": [proposal_payload(t) for t in mine],
            "propose_url": reverse("mobilite:transport_create"),
            "pending": Transport.objects.filter(statut="en_attente").count() if user.is_staff else 0,
            "admin_url": reverse("mobilite:admin") if user.is_staff else None,
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


class TransportCreate(ModuleCreateView):
    """Un citoyen propose des transports (approbation nécessaire) ; un administrateur les ajoute directement."""

    model = Transport
    form_class = TransportForm
    app_ns = "mobilite"
    owner_field = "propose_par"

    @property
    def title(self):
        return "Ajouter un transport" if self.request.user.is_staff else "Proposer un transport"

    @property
    def intro(self):
        if self.request.user.is_staff:
            return "Les unités sont ajoutées tout de suite au stock de la station (aucune approbation nécessaire)."
        return "Choisissez la station, le type de transport et le nombre d'unités. Un administrateur validera votre proposition."

    def get_initial(self):
        return {"station": self.request.GET.get("station")}

    def get_form_kwargs(self):
        return {**super().get_form_kwargs(), "user": self.request.user}

    def form_valid(self, form):
        if not self.request.user.is_staff:
            self.success_message = "Proposition envoyée. Un administrateur doit l'approuver."
            return super().form_valid(form)
        self.success_message = "Transport ajouté à la station."
        response = super().form_valid(form)
        self.object.approuver()
        return response

    def get_success_url(self):
        if self.request.user.is_staff:
            return reverse("mobilite:admin_station", args=[self.object.station_id])
        return super().get_success_url()

    def get_props(self, context):
        props = super().get_props(context)
        if self.request.user.is_staff:
            props["list_url"] = reverse("mobilite:admin")
        return props


class MesReservations(LoginRequiredMixin, InertiaMixin, ListView):
    component = "Mobilite/Reservations"

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            return redirect("mobilite:admin_reservations")
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related("depart", "arrivee", "transport")

    def get_props(self, context):
        now = timezone.now()
        return {"reservations": [reservation_payload(r, now) for r in context["object_list"]]}


@login_required
@require_POST
def annuler(request, pk):
    with transaction.atomic():
        r = get_object_or_404(Reservation.objects.select_for_update(), pk=pk, user=request.user)
        if r.annuler():
            messages.success(request, "Réservation annulée.")
    return redirect("mobilite:reservations")


# ------------------------------------------------------------------ Administration


class AdminMobilite(StaffRequiredMixin, InertiaMixin, TemplateView):
    """Tableau de gestion de la mobilité (frontend/pages/Admin/Mobilite.jsx)."""

    component = "Admin/Mobilite"

    def get_props(self, context):
        now = timezone.localtime()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        stations = [station_payload(s) for s in stations_with_stock()]
        confirmed = Reservation.objects.filter(statut="confirmee").select_related("depart", "arrivee", "transport", "user")
        upcoming = confirmed.filter(date_depart__gte=now).order_by("date_depart")
        return {
            "stations": sorted(stations, key=lambda s: ({"vide": 0, "bas": 1, "ok": 2}[s["level"]], s["units"])),
            "kpis": {
                "stations": len(stations),
                "units": sum(s["units"] for s in stations),
                "maintenance": sum(s["maintenance"] for s in stations),
                "empty": sum(s["level"] == "vide" for s in stations),
                "low": sum(s["level"] == "bas" for s in stations),
                "pending": Transport.objects.filter(statut="en_attente").count(),
                "today": confirmed.filter(date_depart__gte=start, date_depart__lt=start + timedelta(days=1)).count(),
                "upcoming": upcoming.count(),
            },
            "next": [reservation_payload(r, now, admin=True) for r in upcoming[:5]],
            "low_threshold": Station.SEUIL_BAS,
            "urls": {
                "station_create": reverse("mobilite:create"),
                "transport_create": reverse("mobilite:transport_create"),
                "reservations": reverse("mobilite:admin_reservations"),
                "proposals": reverse("mobilite:admin_transports"),
                "public": reverse("mobilite:list"),
            },
        }


class StationFormMixin(StaffRequiredMixin, InertiaFormMixin):
    """Ajouter / modifier une station (frontend/pages/Mobilite/StationForm.jsx)."""

    model = Station
    form_class = StationForm
    component = "Mobilite/StationForm"

    def get_props(self, context):
        editing = bool(self.object and self.object.pk)
        return {
            **super().get_props(context),
            "editing": editing,
            "action": self.request.path,
            "back_url": reverse("mobilite:admin_station", args=[self.object.pk]) if editing else reverse("mobilite:admin"),
            "stations": [{"id": s.pk, "name": s.nom, "lat": s.latitude, "lng": s.longitude} for s in Station.objects.exclude(pk=getattr(self.object, "pk", None))],
        }

    def get_success_url(self):
        return reverse("mobilite:admin_station", args=[self.object.pk])


class ItemCreate(StationFormMixin, CreateView):
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Station ajoutée. Ajoutez maintenant ses transports.")
        return response


class StationUpdate(StationFormMixin, UpdateView):
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Station modifiée.")
        return response


class AdminStation(StaffRequiredMixin, InertiaMixin, DetailView):
    """Gestion d'une station : stock par type, maintenance, réservations à venir (frontend/pages/Admin/Station.jsx)."""

    model = Station
    component = "Admin/Station"

    def get_props(self, context):
        s, now = self.object, timezone.now()
        stock = Transport.stock().filter(station=s).order_by("type")
        upcoming = s.reservations_a_venir().select_related("depart", "arrivee", "transport", "user").order_by("date_depart")
        present = {t.type for t in stock}
        return {
            "station": {**station_payload(Station.objects.prefetch_related(APPROUVES).get(pk=s.pk)), "edit_url": reverse("mobilite:station_update", args=[s.pk]), "delete_url": reverse("mobilite:station_delete", args=[s.pk])},
            "stock": [
                {
                    "id": t.pk,
                    "type": t.type,
                    "type_label": t.get_type_display(),
                    "units": t.unites_disponibles,
                    "maintenance": t.en_maintenance,
                    "update_url": reverse("mobilite:stock_update", args=[t.pk]),
                    "upcoming": upcoming.filter(transport__station=s, transport__type=t.type).aggregate(n=Sum("nombre"))["n"] or 0,
                }
                for t in stock
            ],
            "missing_types": [{"value": v, "label": label} for v, label in Transport.TYPES if v not in present],
            "add_url": reverse("mobilite:transport_create") + f"?station={s.pk}",
            "upcoming": [reservation_payload(r, now, admin=True) for r in upcoming[:20]],
            "upcoming_count": upcoming.count(),
            "pending": [proposal_payload(t) for t in Transport.objects.filter(station=s, statut="en_attente").select_related("station", "propose_par")],
            "urls": {"back": reverse("mobilite:admin"), "proposals": reverse("mobilite:admin_transports")},
        }


@require_POST
@staff_required
def station_supprimer(request, pk):
    s = get_object_or_404(Station, pk=pk)
    n = s.reservations_a_venir().count()
    if n:
        messages.error(request, f"Impossible : {n} réservation(s) à venir utilisent cette station. Annulez-les d'abord.")
        return redirect("mobilite:admin_station", pk=pk)
    nom = s.nom
    s.delete()
    messages.success(request, f"Station « {nom} » supprimée.")
    return redirect("mobilite:admin")


def _entier(value, name):
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name} : un nombre entier est attendu.")
    if n < 0 or n > 9999:
        raise ValueError(f"{name} : entre 0 et 9999.")
    return n


@require_POST
@staff_required
def stock_update(request, pk):
    """Ajuste le stock d'un type dans une station, ou retire ce type (l'historique est gardé)."""
    with transaction.atomic():
        t = get_object_or_404(Transport.stock().select_for_update(), pk=pk)
        if request.POST.get("action") == "retirer":
            if Reservation.objects.filter(transport__station=t.station_id, transport__type=t.type, statut="confirmee", date_depart__gte=timezone.now()).exists():
                messages.error(request, f"Impossible de retirer « {t.get_type_display()} » : des réservations à venir l'utilisent.")
            else:
                t.statut = "retire"
                t.save()
                messages.success(request, f"« {t.get_type_display()} » retiré de la station.")
            return redirect("mobilite:admin_station", pk=t.station_id)
        try:
            units = _entier(request.POST.get("units"), "Disponibles")
            maintenance = _entier(request.POST.get("maintenance"), "En maintenance")
        except ValueError as e:
            messages.error(request, str(e))
            return redirect("mobilite:admin_station", pk=t.station_id)
        t.unites_disponibles, t.en_maintenance = units, maintenance
        t.save()
        messages.success(request, f"Stock « {t.get_type_display()} » mis à jour : {units} disponible(s), {maintenance} en maintenance.")
    return redirect("mobilite:admin_station", pk=t.station_id)


class AdminReservations(StaffRequiredMixin, InertiaMixin, ListView):
    """Toutes les réservations (frontend/pages/Admin/Reservations.jsx). Les filtres se font côté React."""

    component = "Admin/Reservations"

    def get_queryset(self):
        return Reservation.objects.select_related("depart", "arrivee", "transport", "user").order_by("-date_depart")[:500]

    def get_props(self, context):
        now = timezone.localtime()
        return {
            "reservations": [reservation_payload(r, now, admin=True) for r in context["object_list"]],
            "stations": [{"value": s.pk, "label": s.nom} for s in Station.objects.all()],
            "today": now.date().isoformat(),
            "back_url": reverse("mobilite:admin"),
        }


@require_POST
@staff_required
def admin_annuler(request, pk):
    motif = request.POST.get("motif", "").strip()
    if len(motif) < 3:
        messages.error(request, "Indiquez le motif de l'annulation : le citoyen le verra.")
    else:
        with transaction.atomic():
            r = get_object_or_404(Reservation.objects.select_for_update(), pk=pk)
            if r.annuler(motif[:500]):
                messages.success(request, f"Réservation de {display_name(r.user)} annulée. Les unités sont revenues en station.")
    nxt = request.POST.get("next", "")
    return redirect(nxt if nxt.startswith("/") and not nxt.startswith("//") else reverse("mobilite:admin_reservations"))


class AdminTransports(StaffRequiredMixin, InertiaMixin, ListView):
    """Propositions de transports à approuver (frontend/pages/Admin/Transports.jsx)."""

    component = "Admin/Transports"
    queryset = Transport.objects.exclude(statut="retire").exclude(propose_par__is_staff=True).select_related("station", "propose_par")

    def get_props(self, context):
        rows = [{**proposal_payload(t), "decide_url": reverse("mobilite:transport_decide", args=[t.pk])} for t in context["object_list"]]
        rows.sort(key=lambda r: r["status"] != "en_attente")  # en attente d'abord
        return {"rows": rows, "station_create_url": reverse("mobilite:create"), "back_url": reverse("mobilite:admin")}


@require_POST
@staff_required
def decider(request, pk):
    transport = get_object_or_404(Transport, pk=pk)
    decision = request.POST.get("decision")
    if transport.statut == "en_attente" and decision == "approuve":
        transport.approuver()
        messages.success(request, "Transport approuvé : il est maintenant réservable.")
    elif transport.statut == "en_attente" and decision == "refuse":
        motif = request.POST.get("motif", "").strip()
        if len(motif) < 3:
            messages.error(request, "Indiquez le motif du refus : le citoyen le verra.")
        else:
            transport.statut, transport.motif_refus = "refuse", motif[:500]
            transport.save()
            messages.success(request, "Proposition refusée. Le citoyen voit le motif.")
    return redirect("mobilite:admin_transports")
