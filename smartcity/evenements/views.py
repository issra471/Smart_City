"""Événements : les citoyens publient des événements, les autres participent.

L'organisateur modifie ou supprime tant que l'événement est à venir.
L'administration supprime tout événement et voit le tableau de gestion.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, UpdateView

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso, serialize_form
from .forms import EvenementForm
from .models import Evenement


def event_payload(e, user):
    return {
        "id": e.pk,
        "title": e.titre,
        "description": e.description,
        "category": e.categorie,
        "category_label": e.get_categorie_display(),
        "place": e.lieu,
        "address": e.adresse,
        "lat": e.latitude,
        "lng": e.longitude,
        "date": iso(e.date),
        "date_end": iso(e.date_fin) if e.date_fin else None,
        "image": e.image.url if e.image else None,
        "status": e.statut,
        "status_label": e.statut_label,
        "author": display_name(e.organisateur),
        "mine": user.is_authenticated and e.organisateur_id == user.pk,
        "participants": e.nb_participants if hasattr(e, "nb_participants_count") else e.participants.count(),
        "participating": user.is_authenticated and e.participants.filter(pk=user.pk).exists(),
        "created": iso(e.created_at),
        "url": reverse("evenements:detail", args=[e.pk]),
        "participate_url": reverse("evenements:participer", args=[e.pk]),
    }


def event_qs():
    return Evenement.objects.select_related("organisateur").annotate(nb_participants_count=Count("participants"))


# ------------------------------------------------------------------ Citoyens


class ItemList(InertiaMixin, ListView):
    component = "Evenement/List"

    def get_queryset(self):
        return event_qs()

    def get_props(self, context):
        user = self.request.user
        return {
            "items": [event_payload(e, user) for e in context["object_list"]],
            "categories": [{"value": v, "label": label} for v, label in Evenement.CATEGORIES],
            "create_url": reverse("evenements:create"),
            "manage_url": reverse("evenements:admin") if user.is_staff else None,
        }


class FormPageMixin(InertiaFormMixin):
    component = "Evenement/Form"

    def get_props(self, context):
        editing = bool(self.object and self.object.pk)
        return {
            **super().get_props(context),
            "categories": [{"value": v, "label": label} for v, label in Evenement.CATEGORIES],
            "editing": editing,
            "current_image": self.object.image.url if editing and self.object.image else None,
            "action": self.request.path,
            "cancel_url": reverse("evenements:detail", args=[self.object.pk]) if editing else reverse("evenements:list"),
        }


class ItemCreate(LoginRequiredMixin, FormPageMixin, CreateView):
    model = Evenement
    form_class = EvenementForm

    def form_valid(self, form):
        form.instance.organisateur = self.request.user
        response = super().form_valid(form)
        messages.success(self.request, "Événement publié. Partagez-le !")
        return response

    def get_success_url(self):
        return reverse("evenements:detail", args=[self.object.pk])


class ItemUpdate(LoginRequiredMixin, FormPageMixin, UpdateView):
    model = Evenement
    form_class = EvenementForm

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        if not obj.modifiable_par(self.request.user):
            raise PermissionDenied
        return obj

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Événement modifié.")
        return response

    def get_success_url(self):
        return reverse("evenements:detail", args=[self.object.pk])


class ItemDetail(InertiaMixin, DetailView):
    model = Evenement
    component = "Evenement/Detail"

    def get_queryset(self):
        return event_qs()

    def get_props(self, context):
        e, user = self.object, self.request.user
        return {
            "event": event_payload(e, user),
            "can_edit": e.modifiable_par(user),
            "can_delete": e.supprimable_par(user),
            "can_participate": user.is_authenticated and not user.is_staff and e.organisateur_id != user.pk and e.statut != "passe",
            "edit_url": reverse("evenements:update", args=[e.pk]),
            "delete_url": reverse("evenements:delete", args=[e.pk]),
            "list_url": reverse("evenements:admin") if user.is_staff else reverse("evenements:list"),
            "participants_list": [display_name(u) for u in e.participants.all()[:20]],
        }


@login_required
@require_POST
def supprimer(request, pk):
    e = get_object_or_404(Evenement, pk=pk)
    if not e.supprimable_par(request.user):
        raise PermissionDenied
    e.delete()
    messages.success(request, "Événement supprimé.")
    return redirect("evenements:admin" if request.user.is_staff else "evenements:list")


@login_required
@require_POST
def participer(request, pk):
    e = get_object_or_404(Evenement, pk=pk)
    if request.user.is_staff:
        raise PermissionDenied
    if e.statut == "passe":
        messages.info(request, "Cet événement est déjà passé.")
    elif e.participants.filter(pk=request.user.pk).exists():
        e.participants.remove(request.user)
        messages.info(request, "Participation retirée.")
    else:
        e.participants.add(request.user)
        messages.success(request, "Vous participez ! Rendez-vous là-bas.")
    nxt = request.POST.get("next", "")
    fallback = reverse("evenements:detail", args=[pk])
    return redirect(nxt if nxt.startswith("/") and not nxt.startswith("//") else fallback)


# ------------------------------------------------------------------ Administration


class AdminEvenements(StaffRequiredMixin, InertiaMixin, ListView):
    component = "Admin/Evenements"

    def get_queryset(self):
        return event_qs()

    def get_props(self, context):
        user = self.request.user
        items = [event_payload(e, user) for e in context["object_list"]]
        return {
            "items": items,
            "categories": [{"value": v, "label": label} for v, label in Evenement.CATEGORIES],
        }
