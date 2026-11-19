from decimal import Decimal
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.views.decorators.http import require_POST
from django.views.generic import CreateView, ListView, TemplateView, UpdateView
from inertia import render as inertia_render

from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso, serialize_form
from core.views import ModuleListView
from .forms import ProduitForm
from .models import Commande, LigneCommande, PanierItem, Produit


class ItemList(ModuleListView):
    """Marché local : seuls les produits disponibles sont affichés.
    Le bouton d'ajout est retiré, et chaque produit dispose d'un bouton d'ajout au panier.
    """
    queryset = Produit.objects.select_related("vendeur").filter(quantite__gt=0, disponible=True)
    title = "Marché local"
    subtitle = "Découvrez et commandez les produits frais et locaux de nos citoyens."
    app_ns = "marketplace"
    add_label = ""  # Bouton d'ajout retiré de la liste du marché

    def serialize(self, o):
        return {
            **super().serialize(o),
            "price": str(o.prix),
            "quantity": o.formatted_quantite,
            "raw_quantity": float(o.quantite),
            "unit": o.get_unite_display(),
            "date": iso(o.created_at),
            "author": display_name(o.vendeur),
            "author_id": o.vendeur_id,
            "is_available": o.quantite > 0 and o.disponible,
            "add_to_cart_url": reverse("marketplace:panier_ajouter", args=[o.pk]),
        }

    def get_props(self, context):
        props = super().get_props(context)
        props["create_url"] = None  # Pas de bouton de création sur la liste du marché
        props["can_add"] = False
        return props


class MesProduitsView(LoginRequiredMixin, InertiaMixin, ListView):
    """Section 'Mes produits' sous Mon compte : lister, publier, modifier et supprimer ses produits."""
    model = Produit
    component = "Marketplace/MesProduits"

    def get_queryset(self):
        return Produit.objects.filter(vendeur=self.request.user).order_by("-created_at")

    def get_props(self, context):
        empty_form = ProduitForm()
        return {
            "products": [
                {
                    "id": p.pk,
                    "title": p.titre,
                    "description": p.description,
                    "price": str(p.prix),
                    "quantity": p.formatted_quantite,
                    "raw_quantity": float(p.quantite),
                    "unit": p.unite,
                    "unit_label": p.get_unite_display(),
                    "image": p.card_image,
                    "is_available": p.quantite > 0 and p.disponible,
                    "created_at": iso(p.created_at),
                    "edit_url": reverse("marketplace:update", args=[p.pk]),
                    "delete_url": reverse("marketplace:delete", args=[p.pk]),
                }
                for p in context["object_list"]
            ],
            "create_url": reverse("marketplace:create"),
            "form": serialize_form(empty_form),
            "units": [{"value": v, "label": l} for v, l in Produit.UNITES],
        }


class ItemCreate(LoginRequiredMixin, InertiaFormMixin, CreateView):
    """Créer / publier un produit."""
    model = Produit
    form_class = ProduitForm
    component = "Marketplace/Form"

    def form_valid(self, form):
        form.instance.vendeur = self.request.user
        response = super().form_valid(form)
        messages.success(self.request, f"Votre produit « {self.object.titre} » a été publié avec succès !")
        return response

    def get_success_url(self):
        return reverse("marketplace:mes_produits")

    def get_props(self, context):
        return {
            **super().get_props(context),
            "title": "Publier un produit",
            "intro": "Proposez vos produits locaux aux habitants de la ville.",
            "back_url": reverse("marketplace:mes_produits"),
            "is_editing": False,
        }


class ItemUpdate(LoginRequiredMixin, InertiaFormMixin, UpdateView):
    """Modifier un produit existant."""
    model = Produit
    form_class = ProduitForm
    component = "Marketplace/Form"

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        if obj.vendeur_id != self.request.user.pk and not self.request.user.is_staff:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres produits.")
        return obj

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f"Le produit « {self.object.titre} » a été mis à jour.")
        return response

    def get_success_url(self):
        return reverse("marketplace:mes_produits")

    def get_props(self, context):
        return {
            **super().get_props(context),
            "title": "Modifier le produit",
            "intro": f"Mise à jour des informations de « {self.object.titre} ».",
            "back_url": reverse("marketplace:mes_produits"),
            "is_editing": True,
            "product_id": self.object.pk,
            "current_image": self.object.card_image,
        }


@require_POST
def item_delete(request, pk):
    """Supprimer un produit."""
    if not request.user.is_authenticated:
        raise PermissionDenied
    produit = get_object_or_404(Produit, pk=pk)
    if produit.vendeur_id != request.user.pk and not request.user.is_staff:
        raise PermissionDenied("Vous ne pouvez supprimer que vos propres produits.")
    titre = produit.titre
    produit.delete()
    messages.success(request, f"Le produit « {titre} » a été supprimé.")
    return redirect("marketplace:mes_produits")


class PanierView(LoginRequiredMixin, InertiaMixin, TemplateView):
    """Afficher le panier de l'utilisateur et ses commandes passées."""
    component = "Marketplace/Panier"

    def get_props(self, context):
        user = self.request.user
        items = PanierItem.objects.filter(user=user).select_related("produit", "produit__vendeur")

        serialized_items = []
        total = Decimal("0.00")
        for it in items:
            p = it.produit
            st = it.sous_total
            total += st
            serialized_items.append({
                "id": it.pk,
                "product_id": p.pk,
                "title": p.titre,
                "price": str(p.prix),
                "quantity": float(it.quantite),
                "formatted_quantity": str(int(it.quantite)) if it.quantite == it.quantite.to_integral() else str(it.quantite.normalize()),
                "unit": p.get_unite_display(),
                "image": p.card_image,
                "stock_available": float(p.quantite),
                "seller": display_name(p.vendeur),
                "subtotal": f"{st:.2f}",
                "remove_url": reverse("marketplace:panier_supprimer", args=[it.pk]),
                "update_url": reverse("marketplace:panier_modifier", args=[it.pk]),
            })

        orders = Commande.objects.filter(client=user).prefetch_related("lignes").order_by("-created_at")[:10]
        serialized_orders = [
            {
                "id": o.pk,
                "date": iso(o.created_at),
                "status": o.statut,
                "status_label": o.get_statut_display(),
                "total": str(o.total),
                "items": [
                    {
                        "id": l.pk,
                        "title": l.titre_produit,
                        "price": str(l.prix_unitaire),
                        "quantity": str(int(l.quantite)) if l.quantite == l.quantite.to_integral() else str(l.quantite.normalize()),
                        "unit": l.unite,
                        "subtotal": str(l.sous_total),
                    }
                    for l in o.lignes.all()
                ],
            }
            for o in orders
        ]

        return {
            "items": serialized_items,
            "total": f"{total:.2f}",
            "item_count": len(serialized_items),
            "orders": serialized_orders,
            "clear_url": reverse("marketplace:panier_vider"),
            "order_url": reverse("marketplace:panier_commander"),
            "market_url": reverse("marketplace:list"),
        }


@require_POST
def panier_ajouter(request, pk):
    """Ajouter un produit au panier."""
    if not request.user.is_authenticated:
        messages.info(request, "Veuillez vous connecter pour ajouter un produit à votre panier.")
        return redirect("accounts:login")

    produit = get_object_or_404(Produit, pk=pk)
    if produit.vendeur_id == request.user.pk:
        messages.warning(request, "Vous ne pouvez pas ajouter votre propre produit au panier.")
        return redirect(request.META.get("HTTP_REFERER") or "marketplace:list")

    if produit.quantite <= 0 or not produit.disponible:
        messages.error(request, "Ce produit n'est plus disponible en stock.")
        return redirect(request.META.get("HTTP_REFERER") or "marketplace:list")

    try:
        qty_to_add = Decimal(request.POST.get("quantite", "1.00"))
        if qty_to_add <= 0:
            qty_to_add = Decimal("1.00")
    except Exception:
        qty_to_add = Decimal("1.00")

    item, created = PanierItem.objects.get_or_create(
        user=request.user,
        produit=produit,
        defaults={"quantite": min(qty_to_add, produit.quantite)},
    )
    if not created:
        nouvelle_qte = item.quantite + qty_to_add
        if nouvelle_qte > produit.quantite:
            item.quantite = produit.quantite
            messages.warning(request, f"Quantité ajustée au stock maximal disponible ({produit.formatted_quantite} {produit.get_unite_display()}).")
        else:
            item.quantite = nouvelle_qte
            messages.success(request, f"« {produit.titre} » ajouté au panier (total : {item.quantite} {produit.get_unite_display()}).")
        item.save()
    else:
        messages.success(request, f"« {produit.titre} » a été ajouté à votre panier.")

    return redirect(request.META.get("HTTP_REFERER") or "marketplace:panier")


@require_POST
def panier_modifier(request, pk):
    """Mettre à jour la quantité d'un article dans le panier."""
    if not request.user.is_authenticated:
        raise PermissionDenied
    item = get_object_or_404(PanierItem, pk=pk, user=request.user)
    try:
        nouvelle_qte = Decimal(request.POST.get("quantite", "1.00"))
    except Exception:
        nouvelle_qte = item.quantite

    if nouvelle_qte <= 0:
        item.delete()
        messages.info(request, "Article retiré du panier.")
    else:
        if nouvelle_qte > item.produit.quantite:
            item.quantite = item.produit.quantite
            messages.warning(request, f"Quantité limitée au stock disponible ({item.produit.formatted_quantite} {item.produit.get_unite_display()}).")
        else:
            item.quantite = nouvelle_qte
        item.save()
    return redirect("marketplace:panier")


@require_POST
def panier_supprimer(request, pk):
    """Supprimer un article du panier."""
    if not request.user.is_authenticated:
        raise PermissionDenied
    item = get_object_or_404(PanierItem, pk=pk, user=request.user)
    titre = item.produit.titre
    item.delete()
    messages.success(request, f"« {titre} » a été retiré de votre panier.")
    return redirect("marketplace:panier")


@require_POST
def panier_vider(request):
    """Vider tout le panier."""
    if not request.user.is_authenticated:
        raise PermissionDenied
    request.user.panier_items.all().delete()
    messages.success(request, "Votre panier a été entièrement vidé.")
    return redirect("marketplace:panier")


@require_POST
def panier_commander(request):
    """Passer commande avec tous les articles du panier."""
    if not request.user.is_authenticated:
        raise PermissionDenied
    items = list(request.user.panier_items.select_related("produit").all())
    if not items:
        messages.warning(request, "Votre panier est vide.")
        return redirect("marketplace:panier")

    # Vérification des stocks
    for it in items:
        if it.quantite > it.produit.quantite:
            messages.error(request, f"Stock insuffisant pour « {it.produit.titre} » (disponible : {it.produit.formatted_quantite}).")
            return redirect("marketplace:panier")

    total = sum((it.sous_total for it in items), Decimal("0.00"))
    commande = Commande.objects.create(client=request.user, total=total, statut="confirmee")

    for it in items:
        p = it.produit
        LigneCommande.objects.create(
            commande=commande,
            produit=p,
            titre_produit=p.titre,
            prix_unitaire=p.prix,
            quantite=it.quantite,
            unite=p.get_unite_display(),
            sous_total=it.sous_total,
        )
        # Décrémenter le stock
        p.quantite = max(Decimal("0.00"), p.quantite - it.quantite)
        if p.quantite == 0:
            p.disponible = False
        p.save()

    # Vider le panier
    request.user.panier_items.all().delete()
    messages.success(request, f"Félicitations ! Votre commande #{commande.pk} de {total:.2f} DT a été confirmée avec succès.")
    return redirect("marketplace:panier")
