"""Signalements : un citoyen place un problème sur la carte, l'administration le confie à une équipe et le suit.

Droits :
- tout le monde voit la carte et les signalements ;
- un citoyen connecté signale, et soutient (« Moi aussi ») les signalements des autres ;
- l'auteur modifie ou supprime son signalement tant qu'il est « Ouvert » ;
- un administrateur ne signale pas : il gère (statut, priorité, équipe, message au citoyen),
  supprime, et gère les équipes d'intervention.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, UpdateView
from inertia import render as inertia_render

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso, serialize_form
from .forms import EquipeForm, GestionForm, SignalementForm
from .models import Equipe, Signalement, Suivi


def supported_ids(user):
    return set(user.signalements_soutenus.values_list("pk", flat=True)) if user.is_authenticated else set()


def report_payload(o, user, supported=None):
    """Données d'un signalement pour la carte et les listes. `supported` : ids soutenus par l'utilisateur."""
    if supported is None:
        supported = supported_ids(user)
    return {
        "id": o.pk,
        "title": o.titre,
        "category": o.categorie,
        "category_label": o.get_categorie_display(),
        "status": o.statut,
        "status_label": o.get_statut_display(),
        "priority": o.priorite,
        "priority_label": o.get_priorite_display(),
        "team": o.equipe.nom if o.equipe else None,
        "team_id": o.equipe_id,
        "late": o.en_retard,
        "description": o.description,
        "address": o.adresse,
        "lat": o.latitude,
        "lng": o.longitude,
        "photo": o.photo.url if o.photo else None,
        "author": display_name(o.user),
        "mine": user.is_authenticated and o.user_id == user.pk,
        "supports": o.nb_soutiens if hasattr(o, "nb_soutiens") else o.soutiens.count(),
        "supported": o.pk in supported,
        "date": iso(o.created_at),
        "url": reverse("infrastructures:detail", args=[o.pk]),
        "support_url": reverse("infrastructures:soutenir", args=[o.pk]),
    }


def options():
    return {
        "categories": [{"value": v, "label": label} for v, label in Signalement.CATEGORIES],
        "statuses": [{"value": v, "label": label} for v, label in Signalement.STATUTS],
    }


def reports_qs():
    return Signalement.objects.select_related("user", "equipe").annotate(nb_soutiens=Count("soutiens"))


def appliquer_gestion(o, avant, user, commentaire=""):
    """Après une modification par l'administration : note le changement dans le suivi du citoyen."""
    statut_change = o.statut != avant["statut"]
    equipe_change = o.equipe_id != avant["equipe_id"] and o.equipe_id is not None
    if statut_change or equipe_change or commentaire:
        Suivi.objects.create(signalement=o, statut=o.statut, commentaire=commentaire, equipe=o.equipe if equipe_change else None, auteur=user)


def safe_next(request, fallback):
    nxt = request.POST.get("next", "")
    return nxt if url_has_allowed_host_and_scheme(nxt, allowed_hosts={request.get_host()}) and nxt.startswith("/") else fallback


# ------------------------------------------------------------------ Citoyens


class ItemList(InertiaMixin, ListView):
    """Carte + liste de tous les signalements (frontend/pages/Signalement/List.jsx)."""

    component = "Signalement/List"

    def get_queryset(self):
        return reports_qs()

    def get_props(self, context):
        user = self.request.user
        mine = supported_ids(user)
        return {
            "reports": [report_payload(o, user, mine) for o in context["object_list"]],
            **options(),
            # L'administration ne signale pas : elle gère depuis son tableau de bord.
            "create_url": None if user.is_staff else reverse("infrastructures:create"),
            "manage_url": reverse("infrastructures:admin") if user.is_staff else None,
        }


class CitizenOnlyMixin:
    """Signaler est réservé aux citoyens : un administrateur reçoit une page « accès refusé »."""

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)


class FormPageMixin(InertiaFormMixin):
    """Page de formulaire (création ou modification) : frontend/pages/Signalement/Form.jsx."""

    component = "Signalement/Form"

    def get_props(self, context):
        user = self.request.user
        # Signalements non résolus à proximité : la page propose « Moi aussi » au lieu d'un doublon.
        nearby = reports_qs().exclude(statut="resolu").exclude(latitude=None).exclude(pk=getattr(self.object, "pk", None))
        mine = supported_ids(user)
        editing = bool(self.object and self.object.pk)
        return {
            **super().get_props(context),
            **options(),
            "nearby": [report_payload(o, user, mine) for o in nearby],
            "editing": editing,
            "current_photo": self.object.photo.url if editing and self.object.photo else None,
            "action": self.request.path,
            "cancel_url": reverse("infrastructures:detail", args=[self.object.pk]) if editing else reverse("infrastructures:list"),
        }


class ItemCreate(LoginRequiredMixin, CitizenOnlyMixin, FormPageMixin, CreateView):
    model = Signalement
    form_class = SignalementForm

    def form_valid(self, form):
        form.instance.user = self.request.user
        # Confié automatiquement à l'équipe qui traite cette catégorie.
        form.instance.equipe = Equipe.pour_categorie(form.cleaned_data["categorie"])
        response = super().form_valid(form)
        Suivi.objects.create(signalement=self.object, statut="ouvert", equipe=self.object.equipe, auteur=self.request.user)
        messages.success(self.request, "Signalement envoyé. Merci, il sera suivi par les équipes.")
        return response

    def get_success_url(self):
        return reverse("infrastructures:detail", args=[self.object.pk])


class ItemUpdate(LoginRequiredMixin, FormPageMixin, UpdateView):
    model = Signalement
    form_class = SignalementForm

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        if not obj.modifiable_par(self.request.user):
            raise PermissionDenied
        return obj

    def form_valid(self, form):
        # Catégorie changée avant toute prise en charge : l'équipe proposée suit la catégorie.
        if "categorie" in form.changed_data:
            form.instance.equipe = Equipe.pour_categorie(form.cleaned_data["categorie"])
        response = super().form_valid(form)
        messages.success(self.request, "Signalement modifié.")
        return response

    def get_success_url(self):
        return reverse("infrastructures:detail", args=[self.object.pk])


class ItemDetail(InertiaMixin, DetailView):
    """Page d'un signalement : photo, carte, suivi, actions (frontend/pages/Signalement/Detail.jsx)."""

    model = Signalement
    component = "Signalement/Detail"

    def get_queryset(self):
        return reports_qs()

    def get_props(self, context, gestion_form=None):
        o, user = self.object, self.request.user
        suivis = list(o.suivis.select_related("auteur", "equipe"))
        reached = {}
        for s in suivis:
            reached.setdefault(s.statut, iso(s.created_at))
        reached.setdefault("ouvert", iso(o.created_at))
        events = []
        for s in suivis:
            if s.equipe and s.statut != "ouvert":
                events.append({"id": f"e{s.pk}", "kind": "team", "text": f"Confié à {s.equipe.nom}.", "author": "Administration", "date": iso(s.created_at), "status_label": s.get_statut_display()})
            if s.commentaire:
                events.append({"id": s.pk, "kind": "message", "text": s.commentaire, "author": "Administration", "date": iso(s.created_at), "status_label": s.get_statut_display()})
        props = {
            "report": {**report_payload(o, user), "photo_after": o.photo_apres.url if o.photo_apres else None, "updated": iso(o.updated_at)},
            "steps": [{"key": k, "label": label, "date": reached.get(k)} for k, label in Signalement.STATUTS],
            "messages": events,
            "can_edit": o.modifiable_par(user),
            "can_delete": o.supprimable_par(user),
            "can_support": user.is_authenticated and not user.is_staff and o.user_id != user.pk and o.statut != "resolu",
            "edit_url": reverse("infrastructures:update", args=[o.pk]),
            "delete_url": reverse("infrastructures:delete", args=[o.pk]),
            "list_url": reverse("infrastructures:admin") if user.is_staff else reverse("infrastructures:list"),
            "manage": None,
        }
        if user.is_staff:
            form = gestion_form or GestionForm(instance=o)
            props["manage"] = {"form": serialize_form(form), "url": reverse("infrastructures:gerer", args=[o.pk])}
        return props


class ItemManage(LoginRequiredMixin, ItemDetail):
    """Administration : statut, priorité, équipe, message, photo après (depuis la page détail)."""

    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied
        self.object = self.get_object()
        avant = {"statut": self.object.statut, "equipe_id": self.object.equipe_id}
        form = GestionForm(request.POST, request.FILES, instance=self.object)
        if not form.is_valid():
            return inertia_render(request, self.component, self.get_props(self.get_context_data(), form))
        o = form.save()
        appliquer_gestion(o, avant, request.user, form.cleaned_data["commentaire"].strip())
        messages.success(request, "Signalement mis à jour. Le citoyen voit le suivi sur sa page.")
        return redirect("infrastructures:detail", pk=o.pk)


@login_required
@require_POST
def supprimer(request, pk):
    o = get_object_or_404(Signalement, pk=pk)
    if not o.supprimable_par(request.user):
        raise PermissionDenied
    o.delete()
    messages.success(request, "Signalement supprimé.")
    return redirect("infrastructures:admin" if request.user.is_staff else "infrastructures:list")


@login_required
@require_POST
def soutenir(request, pk):
    """« Moi aussi » : ajoute ou retire le soutien d'un citoyen."""
    o = get_object_or_404(Signalement, pk=pk)
    if request.user.is_staff:
        raise PermissionDenied
    if o.user_id == request.user.pk:
        messages.info(request, "C'est votre propre signalement.")
    elif o.soutiens.filter(pk=request.user.pk).exists():
        o.soutiens.remove(request.user)
        messages.info(request, "Soutien retiré.")
    else:
        o.soutiens.add(request.user)
        messages.success(request, "Merci ! Votre soutien aide à traiter ce problème plus vite.")
    return redirect(safe_next(request, reverse("infrastructures:detail", args=[pk])))


# ------------------------------------------------------------------ Administration

PRIORITE_ORDRE = {"urgente": 0, "moyenne": 1, "basse": 2}
STATUT_ORDRE = {"ouvert": 0, "en_cours": 1, "resolu": 2}


class AdminReports(StaffRequiredMixin, InertiaMixin, ListView):
    """Tableau de bord des signalements (frontend/pages/Admin/Signalements.jsx).

    File d'attente : non résolus d'abord, puis urgents, puis les plus soutenus, puis les plus anciens.
    """

    component = "Admin/Signalements"

    def get_queryset(self):
        return reports_qs()

    def get_props(self, context):
        user = self.request.user
        rows = [{**report_payload(o, user, set()), "quick_url": reverse("infrastructures:rapide", args=[o.pk]), "created_ts": o.created_at.timestamp()} for o in context["object_list"]]
        rows.sort(key=lambda r: (STATUT_ORDRE[r["status"]], PRIORITE_ORDRE[r["priority"]], -r["supports"], r["created_ts"]))
        teams = Equipe.objects.annotate(actifs=Count("signalements", filter=~Q(signalements__statut="resolu")))
        return {
            "reports": rows,
            **options(),
            "priorities": [{"value": v, "label": label} for v, label in Signalement.PRIORITES],
            "teams": [{"value": e.pk, "label": e.nom, "active": e.actifs} for e in teams],
            "teams_url": reverse("infrastructures:equipes"),
            "late_days": Signalement.JOURS_RETARD,
        }


@require_POST
@login_required
def rapide(request, pk):
    """Action rapide depuis le tableau de bord : un seul champ (statut, priorité ou équipe)."""
    if not request.user.is_staff:
        raise PermissionDenied
    o = get_object_or_404(Signalement, pk=pk)
    avant = {"statut": o.statut, "equipe_id": o.equipe_id}
    statut, priorite, equipe = request.POST.get("statut"), request.POST.get("priorite"), request.POST.get("equipe")
    if statut in dict(Signalement.STATUTS):
        o.statut = statut
    if priorite in dict(Signalement.PRIORITES):
        o.priorite = priorite
    if equipe is not None:
        o.equipe = Equipe.objects.filter(pk=equipe).first() if equipe else None
    o.save()
    appliquer_gestion(o, avant, request.user)
    messages.success(request, f"« {o.titre} » mis à jour.")
    return redirect(safe_next(request, reverse("infrastructures:admin")))


def equipe_payload(e):
    labels = dict(Signalement.CATEGORIES)
    return {
        "id": e.pk,
        "name": e.nom,
        "manager": e.responsable,
        "phone": e.telephone,
        "categories": [{"value": c, "label": labels.get(c, c)} for c in e.categories],
        "active": e.actifs,
        "done": e.resolus,
        "edit_url": reverse("infrastructures:equipe_update", args=[e.pk]),
        "delete_url": reverse("infrastructures:equipe_delete", args=[e.pk]),
    }


class EquipeList(StaffRequiredMixin, InertiaMixin, ListView):
    """Équipes d'intervention (frontend/pages/Admin/Equipes.jsx)."""

    component = "Admin/Equipes"

    def get_queryset(self):
        return Equipe.objects.annotate(
            actifs=Count("signalements", filter=~Q(signalements__statut="resolu")),
            resolus=Count("signalements", filter=Q(signalements__statut="resolu")),
        )

    def get_props(self, context):
        teams = [equipe_payload(e) for e in context["object_list"]]
        covered = {c["value"] for t in teams for c in t["categories"]}
        return {
            "teams": teams,
            "uncovered": [{"value": v, "label": label} for v, label in Signalement.CATEGORIES if v not in covered],
            "create_url": reverse("infrastructures:equipe_create"),
            "reports_url": reverse("infrastructures:admin"),
        }


class EquipeFormMixin(StaffRequiredMixin, InertiaFormMixin):
    model = Equipe
    form_class = EquipeForm
    component = "Admin/EquipeForm"

    def get_success_url(self):
        return reverse("infrastructures:equipes")

    def get_props(self, context):
        editing = bool(self.object and self.object.pk)
        form = context["form"]
        selected = form.data.get("categories", "").split(",") if form.is_bound else (self.object.categories if editing else [])
        return {
            **super().get_props(context),
            "editing": editing,
            "categories": options()["categories"],
            "selected": [c for c in selected if c],
            "list_url": reverse("infrastructures:equipes"),
            "action": self.request.path,
        }


class EquipeCreate(EquipeFormMixin, CreateView):
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f"Équipe « {self.object.nom} » créée.")
        return response


class EquipeUpdate(EquipeFormMixin, UpdateView):
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f"Équipe « {self.object.nom} » modifiée.")
        return response


@require_POST
@login_required
def equipe_supprimer(request, pk):
    if not request.user.is_staff:
        raise PermissionDenied
    e = get_object_or_404(Equipe, pk=pk)
    n = e.signalements.exclude(statut="resolu").count()
    e.delete()  # les signalements restent, sans équipe
    messages.success(request, f"Équipe « {e.nom} » supprimée." + (f" {n} signalement(s) en cours sont à réaffecter." if n else ""))
    return redirect("infrastructures:equipes")
