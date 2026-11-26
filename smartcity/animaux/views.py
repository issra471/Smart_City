"""Animaux : les citoyens placent un animal sur la carte.

- Animal en difficulté (blessé, errant, en danger, mort) : confié automatiquement à un partenaire
  (vétérinaire, association...) et suivi jusqu'au résultat.
- Observation : simplement partagée sur la carte, sans suivi.

Droits : les citoyens signalent et confirment (« Je l'ai vu aussi ») ; l'auteur modifie ou supprime tant que ce
n'est pas pris en charge (toujours pour une observation) ; l'administration ne signale pas : elle gère, rejette
avec un motif, supprime et gère les partenaires.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, UpdateView
from inertia import render as inertia_render

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso, serialize_form
from .forms import ActionRapideForm, GestionForm, ObservationForm, PartenaireForm
from .models import Observation, Partenaire, SuiviAnimal


def seen_ids(user):
    return set(user.animaux_vus_aussi.values_list("pk", flat=True)) if user.is_authenticated else set()


def payload(o, user, seen=None):
    if seen is None:
        seen = seen_ids(user)
    return {
        "id": o.pk,
        "title": o.titre,
        "species": o.espece,
        "case": o.cas,
        "case_label": o.get_cas_display(),
        "urgent": o.urgence,
        "animal": o.animal,
        "animal_label": o.get_animal_display(),
        "count": o.nombre,
        "seen_at": iso(o.vu_le),
        "status": o.statut,
        "status_label": o.get_statut_display(),
        "priority": o.priorite,
        "priority_label": o.get_priorite_display(),
        "result": o.resultat,
        "result_label": o.get_resultat_display() if o.resultat else "",
        "partner": o.partenaire.nom if o.partenaire else None,
        "partner_id": o.partenaire_id,
        "late": o.en_retard,
        "description": o.description,
        "address": o.lieu,
        "lat": o.latitude,
        "lng": o.longitude,
        "photo": o.photo.url if o.photo else None,
        "author": display_name(o.user),
        "mine": user.is_authenticated and o.user_id == user.pk,
        "supports": o.nb_soutiens if hasattr(o, "nb_soutiens") else o.soutiens.count(),
        "supported": o.pk in seen,
        "date": iso(o.created_at),
        "url": reverse("animaux:detail", args=[o.pk]),
        "support_url": reverse("animaux:soutenir", args=[o.pk]),
    }


def options():
    return {
        "cases": [{"value": v, "label": label, "urgent": v in Observation.URGENCES} for v, label in Observation.CAS],
        "animals": [{"value": v, "label": label} for v, label in Observation.ANIMAUX],
        "statuses": [{"value": v, "label": label} for v, label in Observation.STATUTS],
    }


def qs():
    return Observation.objects.select_related("user", "partenaire").annotate(nb_soutiens=Count("soutiens"))


def note_gestion(o, avant, user, commentaire=""):
    """Note dans le suivi du citoyen un changement de statut, de partenaire ou un message."""
    statut_change = o.statut != avant["statut"]
    partenaire_change = o.partenaire_id != avant["partenaire_id"] and o.partenaire_id is not None
    if statut_change or partenaire_change or commentaire:
        SuiviAnimal.objects.create(observation=o, statut=o.statut, commentaire=commentaire, partenaire=o.partenaire if partenaire_change else None, auteur=user)


def safe_next(request, fallback):
    nxt = request.POST.get("next", "")
    return nxt if nxt.startswith("/") and not nxt.startswith("//") else fallback


# ------------------------------------------------------------------ Citoyens


class ItemList(InertiaMixin, ListView):
    """Carte + liste (frontend/pages/Animal/List.jsx)."""

    component = "Animal/List"

    def get_queryset(self):
        return qs()

    def get_props(self, context):
        user = self.request.user
        seen = seen_ids(user)
        return {
            "items": [payload(o, user, seen) for o in context["object_list"]],
            **options(),
            "create_url": None if user.is_staff else reverse("animaux:create"),
            "manage_url": reverse("animaux:admin") if user.is_staff else None,
        }


class CitizenOnlyMixin:
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            raise PermissionDenied  # l'administration gère, elle ne signale pas
        return super().dispatch(request, *args, **kwargs)


class FormPageMixin(InertiaFormMixin):
    """Formulaire en 3 étapes (frontend/pages/Animal/Form.jsx)."""

    component = "Animal/Form"

    def get_initial(self):
        return {"vu_le": timezone.localtime().replace(second=0, microsecond=0)}

    def get_props(self, context):
        user = self.request.user
        editing = bool(self.object and self.object.pk)
        # Animaux en difficulté non résolus : la page propose « Je l'ai vu aussi » au lieu d'un doublon.
        nearby = qs().filter(cas__in=Observation.URGENCES, statut__in=["ouvert", "en_cours"]).exclude(latitude=None).exclude(pk=getattr(self.object, "pk", None))
        seen = seen_ids(user)
        return {
            **super().get_props(context),
            **options(),
            "nearby": [payload(o, user, seen) for o in nearby],
            "editing": editing,
            "current_photo": self.object.photo.url if editing and self.object.photo else None,
            "action": self.request.path,
            "cancel_url": reverse("animaux:detail", args=[self.object.pk]) if editing else reverse("animaux:list"),
        }


class ItemCreate(LoginRequiredMixin, CitizenOnlyMixin, FormPageMixin, CreateView):
    model = Observation
    form_class = ObservationForm

    def form_valid(self, form):
        o = form.instance
        o.user = self.request.user
        if o.urgence:
            o.priorite = o.priorite_initiale()
            o.partenaire = Partenaire.pour_cas(o.cas)
        response = super().form_valid(form)
        if self.object.urgence:
            SuiviAnimal.objects.create(observation=self.object, statut="ouvert", partenaire=self.object.partenaire, auteur=self.request.user)
            messages.success(self.request, "Signalement envoyé. Merci, la ville prévient un partenaire.")
        else:
            messages.success(self.request, "Observation partagée. Merci !")
        return response

    def get_success_url(self):
        return reverse("animaux:detail", args=[self.object.pk])


class ItemUpdate(LoginRequiredMixin, FormPageMixin, UpdateView):
    model = Observation
    form_class = ObservationForm

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        if not obj.modifiable_par(self.request.user):
            raise PermissionDenied
        return obj

    def form_valid(self, form):
        o = form.instance
        # Le type de cas a changé (pas encore pris en charge) : priorité et partenaire suivent le nouveau cas.
        if "cas" in form.changed_data:
            o.priorite = o.priorite_initiale() if o.urgence else "moyenne"
            o.partenaire = Partenaire.pour_cas(o.cas) if o.urgence else None
        response = super().form_valid(form)
        if o.urgence and not o.suivis.exists():  # une observation devenue « animal en difficulté »
            SuiviAnimal.objects.create(observation=o, statut="ouvert", partenaire=o.partenaire, auteur=self.request.user)
        messages.success(self.request, "Signalement modifié.")
        return response

    def get_success_url(self):
        return reverse("animaux:detail", args=[self.object.pk])


class ItemDetail(InertiaMixin, DetailView):
    """Page d'un animal (frontend/pages/Animal/Detail.jsx)."""

    model = Observation
    component = "Animal/Detail"

    def get_queryset(self):
        return qs()

    def get_props(self, context, gestion_form=None):
        o, user = self.object, self.request.user
        suivis = list(o.suivis.select_related("partenaire"))
        reached = {}
        for s in suivis:
            reached.setdefault(s.statut, iso(s.created_at))
        reached.setdefault("ouvert", iso(o.created_at))
        events = []
        for s in suivis:
            if s.partenaire and s.statut != "ouvert":
                events.append({"id": f"p{s.pk}", "kind": "team", "text": f"Confié à {s.partenaire.nom}.", "date": iso(s.created_at), "status_label": s.get_statut_display()})
            if s.commentaire:
                events.append({"id": s.pk, "kind": "message", "text": s.commentaire, "date": iso(s.created_at), "status_label": s.get_statut_display()})
        props = {
            "item": {**payload(o, user), "updated": iso(o.updated_at)},
            "steps": [{"key": k, "label": label, "date": reached.get(k)} for k, label in Observation.STATUTS if k != "rejete"],
            "messages": events,
            "can_edit": o.modifiable_par(user),
            "can_delete": o.supprimable_par(user),
            "can_support": user.is_authenticated and not user.is_staff and o.user_id != user.pk and o.urgence and not o.termine,
            "edit_url": reverse("animaux:update", args=[o.pk]),
            "delete_url": reverse("animaux:delete", args=[o.pk]),
            "list_url": reverse("animaux:admin") if user.is_staff else reverse("animaux:list"),
            "manage": None,
        }
        if user.is_staff and o.urgence:
            form = gestion_form or GestionForm(instance=o)
            props["manage"] = {"form": serialize_form(form), "url": reverse("animaux:gerer", args=[o.pk])}
        return props


class ItemManage(LoginRequiredMixin, ItemDetail):
    http_method_names = ["get", "post"]

    def get(self, request, *args, **kwargs):
        # Après une erreur, le navigateur affiche cette adresse : l'actualiser ramène à la page détail.
        return redirect("animaux:detail", pk=kwargs["pk"])

    def post(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied
        self.object = self.get_object()
        if not self.object.urgence:
            raise PermissionDenied  # une observation n'a pas de suivi
        avant = {"statut": self.object.statut, "partenaire_id": self.object.partenaire_id}
        form = GestionForm(request.POST, instance=self.object)
        if not form.is_valid():
            return inertia_render(request, self.component, self.get_props(self.get_context_data(), form))
        o = form.save()
        note_gestion(o, avant, request.user, form.cleaned_data["commentaire"].strip())
        messages.success(request, "Signalement mis à jour. Le citoyen voit le suivi sur sa page.")
        return redirect("animaux:detail", pk=o.pk)


@login_required
@require_POST
def supprimer(request, pk):
    o = get_object_or_404(Observation, pk=pk)
    if not o.supprimable_par(request.user):
        raise PermissionDenied
    o.delete()
    messages.success(request, "Supprimé.")
    return redirect("animaux:admin" if request.user.is_staff else "animaux:list")


@login_required
@require_POST
def soutenir(request, pk):
    """« Je l'ai vu aussi » sur un animal en difficulté."""
    o = get_object_or_404(Observation, pk=pk)
    if request.user.is_staff or not o.urgence:
        raise PermissionDenied
    if o.user_id == request.user.pk:
        messages.info(request, "C'est votre propre signalement.")
    elif o.soutiens.filter(pk=request.user.pk).exists():
        o.soutiens.remove(request.user)
        messages.info(request, "Confirmation retirée.")
    else:
        o.soutiens.add(request.user)
        messages.success(request, "Merci ! Votre confirmation aide les partenaires à intervenir.")
    return redirect(safe_next(request, reverse("animaux:detail", args=[pk])))


# ------------------------------------------------------------------ Administration

PRIORITE_ORDRE = {"urgente": 0, "moyenne": 1, "basse": 2}
STATUT_ORDRE = {"ouvert": 0, "en_cours": 1, "resolu": 2, "rejete": 3}


class AdminAnimaux(StaffRequiredMixin, InertiaMixin, ListView):
    """Tableau de gestion (frontend/pages/Admin/Animaux.jsx) : urgents d'abord, puis les plus confirmés, puis les plus anciens."""

    component = "Admin/Animaux"

    def get_queryset(self):
        return qs()

    def get_props(self, context):
        user = self.request.user
        rows = [{**payload(o, user, set()), "quick_url": reverse("animaux:rapide", args=[o.pk]), "ts": o.created_at.timestamp()} for o in context["object_list"]]
        rows.sort(key=lambda r: (not r["urgent"], STATUT_ORDRE[r["status"]], PRIORITE_ORDRE[r["priority"]], -r["supports"], r["ts"]))
        partners = Partenaire.objects.annotate(actifs=Count("cas_confies", filter=Q(cas_confies__statut__in=["ouvert", "en_cours"])))
        return {
            "items": rows,
            **options(),
            "priorities": [{"value": v, "label": label} for v, label in Observation.PRIORITES],
            "results": [{"value": v, "label": label} for v, label in Observation.RESULTATS],
            "partners": [{"value": p.pk, "label": p.nom, "active": p.actifs} for p in partners],
            "partners_url": reverse("animaux:partenaires"),
        }


@require_POST
@login_required
def rapide(request, pk):
    """Action rapide (un seul champ). Rejeter demande un motif : se fait depuis la page détail."""
    if not request.user.is_staff:
        raise PermissionDenied
    o = get_object_or_404(Observation, pk=pk, cas__in=Observation.URGENCES)
    form = ActionRapideForm(request.POST, observation=o)
    if not form.is_valid():
        errors = " ".join(message for field_errors in form.errors.values() for message in field_errors)
        messages.error(request, f"Mise à jour refusée : {errors}")
        return redirect(safe_next(request, reverse("animaux:admin")))

    avant = {"statut": o.statut, "partenaire_id": o.partenaire_id}
    data = form.cleaned_data
    if "statut" in request.POST:
        o.statut = data["statut"]
        if o.statut != "resolu":
            o.resultat = ""
    if "priorite" in request.POST:
        o.priorite = data["priorite"]
    if "partenaire" in request.POST:
        o.partenaire = data["partenaire"]
    if "resultat" in request.POST and o.statut == "resolu":
        o.resultat = data["resultat"]
    o.save()
    note_gestion(o, avant, request.user)
    messages.success(request, f"« {o.titre} » mis à jour.")
    return redirect(safe_next(request, reverse("animaux:admin")))


def partenaire_payload(p):
    labels = dict(Observation.CAS)
    return {
        "id": p.pk,
        "name": p.nom,
        "manager": p.responsable,
        "phone": p.telephone,
        "categories": [{"value": c, "label": labels.get(c, c)} for c in p.categories],
        "active": p.actifs,
        "done": p.resolus,
        "edit_url": reverse("animaux:partenaire_update", args=[p.pk]),
        "delete_url": reverse("animaux:partenaire_delete", args=[p.pk]),
    }


URGENCE_CHOICES = [{"value": v, "label": label} for v, label in Observation.CAS if v in Observation.URGENCES]

PARTNER_TEXTS = {
    "title": "Partenaires",
    "subtitle": "Vétérinaires, associations, services de la ville : chaque nouveau cas est confié automatiquement au partenaire qui le traite.",
    "new": "Nouveau partenaire",
    "create": "Créer le partenaire",
    "edit": "Modifier le partenaire",
    "name": "Nom du partenaire",
    "name_placeholder": "Ex. Vétérinaire de garde",
    "categories": "Cas traités",
    "categories_help": "Les nouveaux signalements de ces cas seront confiés à ce partenaire.",
    "empty": "Aucun partenaire",
    "empty_text": "Ajoutez un vétérinaire, une association de protection animale…",
    "uncovered": "Aucun partenaire ne traite",
    "uncovered_end": "Ces cas arriveront « sans partenaire » et devront être confiés à la main.",
    "delete": "Supprimer le partenaire",
    "back": "Partenaires",
    "reports": "Animaux",
    "aside_title": "Affectation",
    "aside_text": "Quand un citoyen signale un animal en difficulté, il est confié au partenaire qui traite ce cas. Vous pouvez toujours changer depuis le tableau de gestion.",
    "icon": "paw",
}


class PartenaireList(StaffRequiredMixin, InertiaMixin, ListView):
    """Réutilise la page des équipes (frontend/pages/Admin/Equipes.jsx) avec d'autres textes."""

    component = "Admin/Equipes"

    def get_queryset(self):
        return Partenaire.objects.annotate(
            actifs=Count("cas_confies", filter=Q(cas_confies__statut__in=["ouvert", "en_cours"])),
            resolus=Count("cas_confies", filter=Q(cas_confies__statut="resolu")),
        )

    def get_props(self, context):
        teams = [partenaire_payload(p) for p in context["object_list"]]
        covered = {c["value"] for t in teams for c in t["categories"]}
        return {
            "teams": teams,
            "uncovered": [c for c in URGENCE_CHOICES if c["value"] not in covered],
            "create_url": reverse("animaux:partenaire_create"),
            "reports_url": reverse("animaux:admin"),
            "texts": PARTNER_TEXTS,
        }


class PartenaireFormMixin(StaffRequiredMixin, InertiaFormMixin):
    model = Partenaire
    form_class = PartenaireForm
    component = "Admin/EquipeForm"

    def get_success_url(self):
        return reverse("animaux:partenaires")

    def get_props(self, context):
        editing = bool(self.object and self.object.pk)
        form = context["form"]
        selected = form.data.get("categories", "").split(",") if form.is_bound else (self.object.categories if editing else [])
        return {
            **super().get_props(context),
            "editing": editing,
            "categories": URGENCE_CHOICES,
            "selected": [c for c in selected if c],
            "list_url": reverse("animaux:partenaires"),
            "action": self.request.path,
            "texts": PARTNER_TEXTS,
        }


class PartenaireCreate(PartenaireFormMixin, CreateView):
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f"Partenaire « {self.object.nom} » créé.")
        return response


class PartenaireUpdate(PartenaireFormMixin, UpdateView):
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f"Partenaire « {self.object.nom} » modifié.")
        return response


@require_POST
@login_required
def partenaire_supprimer(request, pk):
    if not request.user.is_staff:
        raise PermissionDenied
    p = get_object_or_404(Partenaire, pk=pk)
    n = p.cas_confies.filter(statut__in=["ouvert", "en_cours"]).count()
    p.delete()
    messages.success(request, f"Partenaire « {p.nom} » supprimé." + (f" {n} cas en cours sont à confier à un autre partenaire." if n else ""))
    return redirect("animaux:partenaires")
