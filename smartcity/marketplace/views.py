from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import ListView, UpdateView

from core.inertia_utils import display_name, iso, InertiaMixin, InertiaFormMixin
from core.views import ModuleCreateView, ModuleListView
from .models import PanierItem, Produit, UNITES


class ItemList(ModuleListView):
    """Marché local : liste tous les produits (sans bouton d'ajout)."""
    queryset = Produit.objects.select_related("vendeur")
    title = "Marché local"
    subtitle = "Découvrez les produits proposés par les habitants."
    app_ns = "marketplace"
    add_label = "Publier un produit"

    def get_props(self, context):
        props = super().get_props(context)
        # Supprimer le bouton d'ajout dans la vue publique du marché
        props["hide_add"] = True
        # Ajouter l'URL d'ajout au panier pour chaque produit
        user = self.request.user
        panier_ids = set()
        if user.is_authenticated:
            panier_ids = set(
                PanierItem.objects.filter(user=user).values_list("produit_id", flat=True)
            )
        return props

    def serialize(self, o):
        return {
            **super().serialize(o),
            "price": str(o.prix),
            "quantite": str(o.quantite),
            "unite": o.unite,
            "unite_label": o.get_unite_display(),
            "date": iso(o.created_at),
            "author": display_name(o.vendeur),
            "add_to_cart_url": reverse("marketplace:panier_ajouter", args=[o.pk]),
        }


class ItemCreate(ModuleCreateView):
    model = Produit
    fields = ["titre", "description", "prix", "quantite", "unite", "image"]
    title = "Publier un produit"
    intro = "Présentez votre produit avec une belle photo et un prix clair."
    app_ns = "marketplace"
    owner_field = "vendeur"
    success_message = "Produit publié sur le marché local."

    def get_success_url(self):
        return reverse("marketplace:mes_produits")


class MesProduits(LoginRequiredMixin, InertiaMixin, ListView):
    """Mes produits : liste des produits de l'utilisateur connecté."""
    component = "Marketplace/MesProduits"

    def get_queryset(self):
        return Produit.objects.filter(vendeur=self.request.user)

    def get_props(self, context):
        return {
            "produits": [
                {
                    "id": p.pk,
                    "titre": p.titre,
                    "description": p.description,
                    "prix": str(p.prix),
                    "quantite": str(p.quantite),
                    "unite": p.unite,
                    "unite_label": p.get_unite_display(),
                    "image": p.image.url if p.image else None,
                    "date": iso(p.created_at),
                    "edit_url": reverse("marketplace:produit_modifier", args=[p.pk]),
                    "delete_url": reverse("marketplace:produit_supprimer", args=[p.pk]),
                }
                for p in context["object_list"]
            ],
            "create_url": reverse("marketplace:create"),
        }


class ProduitModifier(LoginRequiredMixin, InertiaFormMixin, UpdateView):
    """Modifier un produit existant."""
    model = Produit
    fields = ["titre", "description", "prix", "quantite", "unite", "image"]
    component = "Module/Form"

    def get_object(self, queryset=None):
        return get_object_or_404(Produit, pk=self.kwargs["pk"], vendeur=self.request.user)

    def get_success_url(self):
        messages.success(self.request, "Produit mis à jour.")
        return reverse("marketplace:mes_produits")

    def get_props(self, context):
        props = super().get_props(context)
        props["title"] = "Modifier le produit"
        props["intro"] = "Modifiez les informations de votre produit."
        props["ns"] = "marketplace"
        props["list_url"] = reverse("marketplace:mes_produits")
        return props

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Produit mis à jour.")
        return response


class MonPanier(LoginRequiredMixin, InertiaMixin, ListView):
    """Mon panier : articles ajoutés par l'utilisateur connecté."""
    component = "Marketplace/MonPanier"

    def get_queryset(self):
        return PanierItem.objects.filter(user=self.request.user).select_related("produit", "produit__vendeur")

    def get_props(self, context):
        items = context["object_list"]
        total = sum(item.total for item in items)
        return {
            "items": [
                {
                    "id": item.pk,
                    "produit_id": item.produit.pk,
                    "titre": item.produit.titre,
                    "prix": str(item.produit.prix),
                    "quantite_panier": item.quantite,
                    "quantite_dispo": str(item.produit.quantite),
                    "unite": item.produit.unite,
                    "unite_label": item.produit.get_unite_display(),
                    "image": item.produit.image.url if item.produit.image else None,
                    "vendeur": display_name(item.produit.vendeur),
                    "total": str(item.total),
                    "remove_url": reverse("marketplace:panier_supprimer", args=[item.pk]),
                }
                for item in items
            ],
            "total": str(total),
            "clear_url": reverse("marketplace:panier_vider"),
            "commande_url": reverse("marketplace:passer_commande"),
        }


# ── Vues d'action (POST) ────────────────────────────────────────────────────

@login_required
@require_POST
def panier_ajouter(request, pk):
    produit = get_object_or_404(Produit, pk=pk)
    item, created = PanierItem.objects.get_or_create(
        user=request.user, produit=produit,
        defaults={"quantite": 1}
    )
    if not created:
        item.quantite += 1
        item.save()
    messages.success(request, f"« {produit.titre} » ajouté au panier.")
    return redirect("marketplace:list")


@login_required
@require_POST
def panier_supprimer(request, pk):
    item = get_object_or_404(PanierItem, pk=pk, user=request.user)
    nom = item.produit.titre
    item.delete()
    messages.success(request, f"« {nom} » retiré du panier.")
    return redirect("marketplace:mon_panier")


@login_required
@require_POST
def panier_vider(request):
    PanierItem.objects.filter(user=request.user).delete()
    messages.success(request, "Votre panier a été vidé.")
    return redirect("marketplace:mon_panier")


@login_required
@require_POST
def passer_commande(request):
    items = PanierItem.objects.filter(user=request.user).select_related("produit")
    if not items.exists():
        messages.error(request, "Votre panier est vide.")
        return redirect("marketplace:mon_panier")
    # Simuler une commande : vider le panier et confirmer
    count = items.count()
    items.delete()
    messages.success(request, f"Commande passée avec succès ! ({count} article{'s' if count > 1 else ''})")
    return redirect("marketplace:list")


@login_required
@require_POST
def produit_supprimer(request, pk):
    produit = get_object_or_404(Produit, pk=pk, vendeur=request.user)
    nom = produit.titre
    produit.delete()
    messages.success(request, f"« {nom} » supprimé.")
    return redirect("marketplace:mes_produits")
