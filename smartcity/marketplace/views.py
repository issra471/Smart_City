"""Marché local : les citoyens publient des produits, les autres consultent et contactent le vendeur.

Le vendeur modifie, marque « vendu » ou supprime son annonce.
L'administration retire une annonce inappropriée (avec motif) et voit le tableau de gestion.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, UpdateView

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso
from .forms import ProduitForm
from .models import Produit


def produit_payload(p, user):
    return {
        "id": p.pk,
        "title": p.titre,
        "description": p.description,
        "category": p.categorie,
        "category_label": p.get_categorie_display(),
        "price": str(p.prix),
        "status": p.statut,
        "status_label": p.get_statut_display(),
        "phone": p.telephone,
        "image": p.image.url if p.image else None,
        "author": display_name(p.vendeur),
        "mine": user.is_authenticated and p.vendeur_id == user.pk,
        "reason": p.motif_retrait,
        "date": iso(p.created_at),
        "url": reverse("marketplace:detail", args=[p.pk]),
    }


# ------------------------------------------------------------------ Citoyens


class ItemList(InertiaMixin, ListView):
    component = "Marketplace/List"

    def get_queryset(self):
        return Produit.objects.select_related("vendeur").exclude(statut="retire")

    def get_props(self, context):
        user = self.request.user
        return {
            "items": [produit_payload(p, user) for p in context["object_list"]],
            "categories": [{"value": v, "label": label} for v, label in Produit.CATEGORIES],
            "create_url": reverse("marketplace:create"),
            "manage_url": reverse("marketplace:admin") if user.is_staff else None,
        }


class FormPageMixin(InertiaFormMixin):
    component = "Marketplace/Form"

    def get_props(self, context):
        editing = bool(self.object and self.object.pk)
        return {
            **super().get_props(context),
            "categories": [{"value": v, "label": label} for v, label in Produit.CATEGORIES],
            "editing": editing,
            "current_image": self.object.image.url if editing and self.object.image else None,
            "action": self.request.path,
            "cancel_url": reverse("marketplace:detail", args=[self.object.pk]) if editing else reverse("marketplace:list"),
        }


class ItemCreate(LoginRequiredMixin, FormPageMixin, CreateView):
    model = Produit
    form_class = ProduitForm

    def form_valid(self, form):
        form.instance.vendeur = self.request.user
        response = super().form_valid(form)
        messages.success(self.request, "Produit publié sur le marché local.")
        return response

    def get_success_url(self):
        return reverse("marketplace:detail", args=[self.object.pk])


class ItemUpdate(LoginRequiredMixin, FormPageMixin, UpdateView):
    model = Produit
    form_class = ProduitForm

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        if not obj.modifiable_par(self.request.user):
            raise PermissionDenied
        return obj

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Produit modifié.")
        return response

    def get_success_url(self):
        return reverse("marketplace:detail", args=[self.object.pk])


class ItemDetail(InertiaMixin, DetailView):
    model = Produit
    component = "Marketplace/Detail"

    def get_queryset(self):
        return Produit.objects.select_related("vendeur")

    def get_props(self, context):
        p, user = self.object, self.request.user
        return {
            "product": produit_payload(p, user),
            "can_edit": p.modifiable_par(user),
            "can_delete": p.supprimable_par(user),
            "can_contact": user.is_authenticated and not user.is_staff and p.vendeur_id != user.pk and p.statut == "disponible",
            "edit_url": reverse("marketplace:update", args=[p.pk]),
            "delete_url": reverse("marketplace:delete", args=[p.pk]),
            "mark_sold_url": reverse("marketplace:mark_sold", args=[p.pk]),
            "list_url": reverse("marketplace:admin") if user.is_staff else reverse("marketplace:list"),
        }


@login_required
@require_POST
def supprimer(request, pk):
    p = get_object_or_404(Produit, pk=pk)
    if not p.supprimable_par(request.user):
        raise PermissionDenied
    p.delete()
    messages.success(request, "Produit supprimé.")
    return redirect("marketplace:admin" if request.user.is_staff else "marketplace:list")


@login_required
@require_POST
def mark_sold(request, pk):
    p = get_object_or_404(Produit, pk=pk)
    if p.vendeur != request.user:
        raise PermissionDenied
    if p.statut == "disponible":
        p.statut = "vendu"
        p.save()
        messages.success(request, "Marqué comme vendu.")
    elif p.statut == "vendu":
        p.statut = "disponible"
        p.save()
        messages.success(request, "Remis en vente.")
    return redirect("marketplace:detail", pk=pk)


# ------------------------------------------------------------------ Administration


class AdminMarketplace(StaffRequiredMixin, InertiaMixin, ListView):
    component = "Admin/Marketplace"

    def get_queryset(self):
        return Produit.objects.select_related("vendeur")

    def get_props(self, context):
        user = self.request.user
        return {
            "items": [produit_payload(p, user) for p in context["object_list"]],
            "categories": [{"value": v, "label": label} for v, label in Produit.CATEGORIES],
        }


@require_POST
@login_required
def retirer(request, pk):
    """L'admin retire une annonce avec un motif."""
    if not request.user.is_staff:
        raise PermissionDenied
    p = get_object_or_404(Produit, pk=pk)
    motif = request.POST.get("motif", "").strip()
    if len(motif) < 3:
        messages.error(request, "Indiquez un motif de retrait (3 caractères minimum).")
        return redirect("marketplace:admin")
    p.statut = "retire"
    p.motif_retrait = motif
    p.save()
    messages.success(request, f"« {p.titre} » retiré du marché.")
    return redirect("marketplace:admin")
