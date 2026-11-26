"""Marché local : les citoyens publient des produits, les autres consultent et contactent le vendeur.

Le vendeur modifie, marque « vendu » ou supprime son annonce.
Les citoyens peuvent ajouter des produits au panier et passer commande.
L'administration retire une annonce inappropriée (avec motif) et voit le tableau de gestion.
"""
import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, DetailView, ListView, TemplateView, UpdateView

from accounts.admin_views import StaffRequiredMixin
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso
from .forms import ProduitForm
from .models import Panier, PanierItem, Produit


def produit_payload(p, user):
    return {
        "id": p.pk,
        "title": p.titre,
        "description": p.description,
        "category": p.categorie,
        "category_label": p.get_categorie_display(),
        "price": str(p.prix),
        "quantite": p.quantite,
        "unite": p.unite,
        "unite_label": p.get_unite_display(),
        "status": p.statut,
        "status_label": p.get_statut_display(),
        "en_rupture": p.en_rupture,
        "phone": p.telephone,
        "image": p.image.url if p.image else None,
        "author": display_name(p.vendeur),
        "mine": user.is_authenticated and p.vendeur_id == user.pk,
        "reason": p.motif_retrait,
        "date": iso(p.created_at),
        "url": reverse("marketplace:detail", args=[p.pk]),
    }


def panier_payload(user):
    """Retourne les données du panier de l'utilisateur."""
    if not user.is_authenticated:
        return {"items": [], "total": "0.00", "count": 0}
    panier, _ = Panier.objects.get_or_create(citoyen=user)
    items = list(panier.items.select_related("produit").all())
    items_data = []
    for item in items:
        p = item.produit
        items_data.append({
            "id": item.pk,
            "produit_id": p.pk,
            "title": p.titre,
            "price": str(p.prix),
            "quantite": item.quantite,
            "unite": p.unite,
            "unite_label": p.get_unite_display(),
            "sous_total": f"{item.sous_total():.2f}",
            "image": p.image.url if p.image else None,
            "url": reverse("marketplace:detail", args=[p.pk]),
            "stock_dispo": p.quantite,
            "status": p.statut,
            "status_label": p.get_statut_display(),
            "en_rupture": p.en_rupture,
            "retirer_url": reverse("marketplace:retirer_du_panier", args=[item.pk]),
            "modifier_url": reverse("marketplace:modifier_quantite", args=[item.pk]),
        })
    return {
        "items": items_data,
        "total": f"{panier.total():.2f}",
        "count": sum(i.quantite for i in items),
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
            "unites": [{"value": v, "label": label} for v, label in Produit.UNITES],
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
        in_cart_qty = 0
        if user.is_authenticated and not user.is_staff:
            in_cart_qty = (
                PanierItem.objects.filter(panier__citoyen=user, produit=p)
                .values_list("quantite", flat=True)
                .first()
                or 0
            )
        return {
            "product": produit_payload(p, user),
            "can_edit": p.modifiable_par(user),
            "can_delete": p.supprimable_par(user),
            "can_contact": user.is_authenticated and not user.is_staff and p.vendeur_id != user.pk and p.statut == "disponible",
            "can_add_to_cart": user.is_authenticated and not user.is_staff and p.vendeur_id != user.pk and p.statut == "disponible" and not p.en_rupture,
            "in_cart_qty": in_cart_qty,
            "add_to_cart_url": reverse("marketplace:add_to_cart", args=[p.pk]),
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


# ------------------------------------------------------------------ Panier


class PanierView(LoginRequiredMixin, InertiaMixin, TemplateView):
    component = "Marketplace/Panier"

    def get_props(self, context):
        return {
            "panier": panier_payload(self.request.user),
            "passer_commande_url": reverse("marketplace:passer_commande"),
        }


def _extract_quantite(request):
    """Lit la quantité envoyée en FormData/POST ou en JSON (Inertia)."""
    if "quantite" in request.POST:
        return str(request.POST.get("quantite", "")).strip()
    if request.content_type == "application/json" and request.body:
        try:
            payload = json.loads(request.body.decode("utf-8"))
            if isinstance(payload, dict) and "quantite" in payload:
                return str(payload["quantite"]).strip()
        except (ValueError, UnicodeDecodeError):
            pass
    return ""


@login_required
@require_POST
def add_to_cart(request, pk):
    """Ajoute un produit au panier du citoyen avec la quantité demandée."""
    p = get_object_or_404(Produit, pk=pk)
    if p.vendeur == request.user or request.user.is_staff:
        messages.error(request, "Vous ne pouvez pas ajouter votre propre produit au panier.")
        return redirect("marketplace:detail", pk=pk)
    if p.statut != "disponible" or p.en_rupture:
        messages.error(request, "Ce produit est en rupture de stock ou indisponible.")
        return redirect("marketplace:detail", pk=pk)

    raw_qte = _extract_quantite(request)
    if not raw_qte.isdigit():
        messages.error(request, "Quantité invalide.")
        return redirect("marketplace:detail", pk=pk)
    qte = int(raw_qte)
    if qte < 1:
        messages.error(request, "La quantité doit être au moins 1.")
        return redirect("marketplace:detail", pk=pk)

    if qte > p.quantite:
        messages.error(request, f"Stock insuffisant. Seulement {p.quantite} {p.get_unite_display()} disponible(s).")
        return redirect("marketplace:detail", pk=pk)

    panier, _ = Panier.objects.get_or_create(citoyen=request.user)
    item, created = PanierItem.objects.get_or_create(panier=panier, produit=p, defaults={"quantite": qte})
    if not created:
        new_qte = item.quantite + qte
        if new_qte > p.quantite:
            messages.error(request, f"Stock insuffisant. Vous avez déjà {item.quantite} dans votre panier.")
            return redirect("marketplace:detail", pk=pk)
        item.quantite = new_qte
        item.save()

    messages.success(request, f"« {p.titre} » ajouté au panier ({qte} {p.get_unite_display()}).")
    return redirect("marketplace:detail", pk=pk)


@login_required
@require_POST
def retirer_du_panier(request, item_pk):
    """Retire un article du panier."""
    panier, _ = Panier.objects.get_or_create(citoyen=request.user)
    item = get_object_or_404(PanierItem, pk=item_pk, panier=panier)
    titre = item.produit.titre
    item.delete()
    messages.success(request, f"« {titre} » retiré du panier.")
    return redirect("marketplace:panier")


@login_required
@require_POST
def modifier_quantite(request, item_pk):
    """Modifie la quantité d'un article dans le panier."""
    panier, _ = Panier.objects.get_or_create(citoyen=request.user)
    item = get_object_or_404(PanierItem, pk=item_pk, panier=panier)
    raw_qte = _extract_quantite(request)
    if not raw_qte.isdigit():
        messages.error(request, "Quantité invalide.")
        return redirect("marketplace:panier")
    qte = int(raw_qte)
    if qte < 1:
        messages.error(request, "La quantité doit être au moins 1.")
        return redirect("marketplace:panier")

    if item.produit.statut != "disponible" or item.produit.quantite == 0:
        messages.error(request, f"« {item.produit.titre} » est en rupture de stock.")
        return redirect("marketplace:panier")

    if qte > item.produit.quantite:
        messages.error(request, f"Stock insuffisant. Seulement {item.produit.quantite} disponible(s).")
        return redirect("marketplace:panier")

    item.quantite = qte
    item.save()
    return redirect("marketplace:panier")


@login_required
@require_POST
def passer_commande(request):
    """Passe la commande : réduit les stocks et vide le panier."""
    if request.user.is_staff:
        raise PermissionDenied

    with transaction.atomic():
        panier, _ = Panier.objects.get_or_create(citoyen=request.user)
        items = list(panier.items.select_related("produit").all())

        if not items:
            messages.error(request, "Votre panier est vide.")
            return redirect("marketplace:panier")

        product_ids = [item.produit_id for item in items]
        locked_products = {
            p.pk: p for p in Produit.objects.select_for_update().filter(pk__in=product_ids)
        }

        for item in items:
            p = locked_products.get(item.produit_id)
            if not p or p.statut != "disponible" or p.quantite == 0:
                messages.error(request, f"« {item.produit.titre} » n'est plus disponible (rupture de stock).")
                return redirect("marketplace:panier")
            if item.quantite > p.quantite:
                messages.error(
                    request,
                    f"Stock insuffisant pour « {p.titre} » ({p.quantite} disponible(s)).",
                )
                return redirect("marketplace:panier")

        for item in items:
            p = locked_products[item.produit_id]
            p.quantite -= item.quantite
            p.save(update_fields=["quantite"])

        panier.vider()

    messages.success(request, "Votre commande a été passée avec succès ! Votre panier a été vidé.")
    return redirect("marketplace:panier")


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
