from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

from .forms import ProduitForm
from .models import Panier, PanierItem, Produit

User = get_user_model()


class MarketplacePanierTests(TestCase):
    def setUp(self):
        self.vendeur = User.objects.create_user(username="vendeur", password="Password123!")
        self.citoyen = User.objects.create_user(username="citoyen", password="Password123!")
        self.staff = User.objects.create_user(username="admin", password="Password123!", is_staff=True)
        self.produit = Produit.objects.create(
            vendeur=self.vendeur,
            titre="Miel de montagne",
            description="Miel naturel récolté localement.",
            categorie="alimentaire",
            prix=Decimal("12.50"),
            quantite=5,
            unite="litre",
            telephone="55123456",
        )

    def test_form_validation_telephone_prix_quantite(self):
        base = {
            "categorie": "alimentaire",
            "titre": "Huile d'olive",
            "description": "Huile d'olive vierge extra de saison.",
            "prix": "25.00",
            "quantite": "10",
            "unite": "litre",
            "telephone": "55123456",
        }
        self.assertTrue(ProduitForm(data=base).is_valid())

        # Téléphone invalide (lettres, symboles, longueur != 8)
        for bad_tel in ["506639;;", "551234ab", "55 123 456", "1234567", "123456789"]:
            form = ProduitForm(data={**base, "telephone": bad_tel})
            self.assertFalse(form.is_valid(), f"Should reject telephone={bad_tel}")
            self.assertIn("telephone", form.errors)

        # Téléphone vide autorisé (facultatif)
        self.assertTrue(ProduitForm(data={**base, "telephone": ""}).is_valid())

        # Prix invalide (lettres, notation scientifique, <= 0)
        for bad_prix in ["abc", "12a", "1e2", "0", "-5", "12."]:
            form = ProduitForm(data={**base, "prix": bad_prix})
            self.assertFalse(form.is_valid(), f"Should reject prix={bad_prix}")
            self.assertIn("prix", form.errors)

        # Quantité invalide (lettres, décimal, <= 0 à la création)
        for bad_qte in ["abc", "10a", "2.5", "0", "-1"]:
            form = ProduitForm(data={**base, "quantite": bad_qte})
            self.assertFalse(form.is_valid(), f"Should reject quantite={bad_qte}")
            self.assertIn("quantite", form.errors)

    def test_add_modify_remove_and_checkout_to_rupture(self):
        self.client.force_login(self.citoyen)

        # Ajout au panier avec quantité 7 (FormData et JSON)
        p2 = Produit.objects.create(
            vendeur=self.vendeur,
            titre="Huile d'olive bio",
            description="Huile d'olive pressée à froid.",
            categorie="alimentaire",
            prix=Decimal("12.66"),
            quantite=87,
            unite="piece",
        )
        resp_json = self.client.post(
            reverse("marketplace:add_to_cart", args=[p2.pk]),
            data='{"quantite": 7}',
            content_type="application/json",
        )
        self.assertRedirects(resp_json, reverse("marketplace:detail", args=[p2.pk]))
        item2 = PanierItem.objects.get(panier__citoyen=self.citoyen, produit=p2)
        self.assertEqual(item2.quantite, 7)
        self.assertEqual(item2.sous_total(), Decimal("88.62"))

        # Modification via JSON à 4
        self.client.post(
            reverse("marketplace:modifier_quantite", args=[item2.pk]),
            data='{"quantite": 4}',
            content_type="application/json",
        )
        item2.refresh_from_db()
        self.assertEqual(item2.quantite, 4)
        item2.delete()
        p2.delete()

        # Ajout au panier (quantité 3 sur 5)
        resp = self.client.post(reverse("marketplace:add_to_cart", args=[self.produit.pk]), {"quantite": 3})
        self.assertRedirects(resp, reverse("marketplace:detail", args=[self.produit.pk]))
        item = PanierItem.objects.get(panier__citoyen=self.citoyen, produit=self.produit)
        self.assertEqual(item.quantite, 3)

        # Tentative d'ajouter 4 de plus (total 7 > 5) refusée
        self.client.post(reverse("marketplace:add_to_cart", args=[self.produit.pk]), {"quantite": 4})
        item.refresh_from_db()
        self.assertEqual(item.quantite, 3)

        # Affichage du panier via Inertia
        resp = self.client.get(reverse("marketplace:panier"), HTTP_X_INERTIA="true")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["component"], "Marketplace/Panier")
        self.assertEqual(len(data["props"]["panier"]["items"]), 1)
        item_prop = data["props"]["panier"]["items"][0]
        self.assertEqual(item_prop["retirer_url"], reverse("marketplace:retirer_du_panier", args=[item.pk]))
        self.assertEqual(item_prop["modifier_url"], reverse("marketplace:modifier_quantite", args=[item.pk]))

        # Réduire la quantité à 2
        resp = self.client.post(item_prop["modifier_url"], {"quantite": 2})
        self.assertRedirects(resp, reverse("marketplace:panier"))
        item.refresh_from_db()
        self.assertEqual(item.quantite, 2)

        # Augmenter à 5 (tout le stock) puis passer commande -> rupture de stock
        self.client.post(item_prop["modifier_url"], {"quantite": 5})
        resp = self.client.post(reverse("marketplace:passer_commande"))
        self.assertRedirects(resp, reverse("marketplace:panier"))

        msgs = [m.message for m in get_messages(resp.wsgi_request)]
        self.assertTrue(any("commande" in m.lower() for m in msgs))

        self.produit.refresh_from_db()
        self.assertEqual(self.produit.quantite, 0)
        self.assertTrue(self.produit.en_rupture)
        self.assertEqual(self.produit.statut, "disponible")
        self.assertEqual(PanierItem.objects.filter(panier__citoyen=self.citoyen).count(), 0)

        # Produit en rupture de stock ne peut plus être ajouté au panier
        detail_resp = self.client.get(reverse("marketplace:detail", args=[self.produit.pk]), HTTP_X_INERTIA="true")
        self.assertFalse(detail_resp.json()["props"]["can_add_to_cart"])
        self.assertTrue(detail_resp.json()["props"]["product"]["en_rupture"])

    def test_remove_item_from_panier(self):
        self.client.force_login(self.citoyen)
        self.client.post(reverse("marketplace:add_to_cart", args=[self.produit.pk]), {"quantite": 2})
        item = PanierItem.objects.get(panier__citoyen=self.citoyen, produit=self.produit)

        resp = self.client.post(reverse("marketplace:retirer_du_panier", args=[item.pk]))
        self.assertRedirects(resp, reverse("marketplace:panier"))
        self.assertEqual(PanierItem.objects.filter(panier__citoyen=self.citoyen).count(), 0)

    def test_seller_and_staff_restrictions(self):
        # Vendeur ne peut pas ajouter son propre produit
        self.client.force_login(self.vendeur)
        self.client.post(reverse("marketplace:add_to_cart", args=[self.produit.pk]), {"quantite": 1})
        self.assertEqual(PanierItem.objects.count(), 0)

        # Staff ne peut pas passer commande
        self.client.force_login(self.staff)
        resp = self.client.post(reverse("marketplace:passer_commande"))
        self.assertEqual(resp.status_code, 403)

    def test_other_modules_unaffected(self):
        self.client.force_login(self.citoyen)
        for url in [
            reverse("home"),
            reverse("dashboard"),
            reverse("mobilite:list"),
            reverse("mobilite:reservations"),
            reverse("infrastructures:list"),
            reverse("evenements:list"),
            reverse("animaux:list"),
            reverse("marketplace:list"),
            reverse("marketplace:create"),
            reverse("marketplace:panier"),
        ]:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200, f"Unexpected status {resp.status_code} for {url}")
