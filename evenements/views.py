from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, UpdateView
from inertia import render as inertia_render

from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso
from core.views import ModuleListView
from .forms import EvenementForm
from .models import Evenement


class ItemList(ModuleListView):
    """Liste citoyenne des événements : à venir et passés."""
    queryset = Evenement.objects.select_related("organisateur").prefetch_related("participants")
    title = "Sortir à My City"
    subtitle = "Culture, nature, rencontres et animations locales."
    app_ns = "evenements"
    add_label = "Proposer un événement"
    filters = [("avenir", "À venir"), ("passe", "Passés")]

    def serialize(self, o):
        user = self.request.user
        is_participant = user.is_authenticated and o.participants.filter(pk=user.pk).exists()
        return {
            **super().serialize(o),
            "place": o.lieu,
            "event_date": iso(o.date),
            "author": display_name(o.organisateur),
            "filter": "avenir" if o.date >= timezone.now() else "passe",
            "url": reverse("evenements:detail", args=[o.pk]),
            "participants_count": o.participants.count(),
            "is_registered": is_participant,
            "can_edit": o.modifiable_par(user),
            "can_delete": o.supprimable_par(user),
        }


class ItemDetail(InertiaMixin, DetailView):
    """Page détaillée d'un événement (consultation citoyenne et admin)."""
    model = Evenement
    component = "Evenement/Detail"

    def get_queryset(self):
        return Evenement.objects.select_related("organisateur").prefetch_related("participants")

    def get_props(self, context):
        o = self.object
        user = self.request.user
        is_participant = user.is_authenticated and o.participants.filter(pk=user.pk).exists()
        is_upcoming = o.date >= timezone.now()

        return {
            "event": {
                "id": o.pk,
                "title": o.titre,
                "description": o.description,
                "lieu": o.lieu,
                "date": iso(o.date),
                "image": o.card_image,
                "author": display_name(o.organisateur),
                "author_id": o.organisateur_id,
                "participants_count": o.participants.count(),
                "is_registered": is_participant,
                "is_upcoming": is_upcoming,
                "created_at": iso(o.created_at) if o.created_at else None,
            },
            "can_edit": o.modifiable_par(user),
            "can_delete": o.supprimable_par(user),
            "edit_url": reverse("evenements:update", args=[o.pk]),
            "delete_url": reverse("evenements:delete", args=[o.pk]),
            "rsvp_url": reverse("evenements:participer", args=[o.pk]),
            "list_url": reverse("evenements:list"),
            "admin_url": reverse("accounts:admin_events") if user.is_staff else None,
        }


class ItemCreate(LoginRequiredMixin, InertiaFormMixin, CreateView):
    """Créer / proposer un événement (citoyen ou admin)."""
    model = Evenement
    form_class = EvenementForm
    component = "Evenement/Form"

    def form_valid(self, form):
        form.instance.organisateur = self.request.user
        response = super().form_valid(form)
        messages.success(self.request, f"L'événement « {self.object.titre} » a été publié avec succès !")
        return response

    def get_success_url(self):
        return reverse("evenements:detail", args=[self.object.pk])

    def get_props(self, context):
        return {
            **super().get_props(context),
            "title": "Créer un événement",
            "intro": "Concert, atelier, balade, conférence… Donnez envie aux habitants de venir.",
            "back_url": reverse("evenements:list"),
            "is_editing": False,
        }


class ItemUpdate(LoginRequiredMixin, InertiaFormMixin, UpdateView):
    """Modifier un événement existant."""
    model = Evenement
    form_class = EvenementForm
    component = "Evenement/Form"

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        if not obj.modifiable_par(self.request.user):
            raise PermissionDenied("Vous n'avez pas l'autorisation de modifier cet événement.")
        return obj

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f"L'événement « {self.object.titre} » a été mis à jour.")
        return response

    def get_success_url(self):
        return reverse("evenements:detail", args=[self.object.pk])

    def get_props(self, context):
        return {
            **super().get_props(context),
            "title": "Modifier l'événement",
            "intro": f"Mettez à jour les informations de « {self.object.titre} ».",
            "back_url": reverse("evenements:detail", args=[self.object.pk]),
            "is_editing": True,
            "event_id": self.object.pk,
            "current_image": self.object.card_image,
        }


@require_POST
def item_delete(request, pk):
    """Supprimer un événement."""
    if not request.user.is_authenticated:
        raise PermissionDenied
    event = get_object_or_404(Evenement, pk=pk)
    if not event.supprimable_par(request.user):
        raise PermissionDenied("Vous n'avez pas l'autorisation de supprimer cet événement.")
    titre = event.titre
    event.delete()
    messages.success(request, f"L'événement « {titre} » a été supprimé.")
    if request.user.is_staff and "admin" in (request.META.get("HTTP_REFERER") or ""):
        return redirect("accounts:admin_events")
    return redirect("evenements:list")


@require_POST
def evenement_participer(request, pk):
    """S'inscrire / se désinscrire à un événement."""
    if not request.user.is_authenticated:
        messages.info(request, "Veuillez vous connecter pour participer à cet événement.")
        return redirect("accounts:login")

    event = get_object_or_404(Evenement, pk=pk)
    if event.participants.filter(pk=request.user.pk).exists():
        event.participants.remove(request.user)
        messages.info(request, f"Vous n'êtes plus inscrit(e) à « {event.titre} ».")
    else:
        event.participants.add(request.user)
        messages.success(request, f"Votre participation à « {event.titre} » est confirmée !")

    return redirect(request.META.get("HTTP_REFERER") or reverse("evenements:detail", args=[event.pk]))
