from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .forms import ActionRapideForm, ObservationForm, PartenaireForm
from .models import Observation, Partenaire


User = get_user_model()


def valid_observation_data(**overrides):
    seen = timezone.localtime(timezone.now() - timedelta(hours=1)).replace(second=0, microsecond=0)
    data = {
        "cas": "blesse",
        "animal": "chat",
        "espece": "Chat roux",
        "nombre": "1",
        "vu_le": seen.strftime("%Y-%m-%dT%H:%M"),
        "description": "Chat blessé devant la pharmacie.",
        "lieu": "Rue centrale",
        "latitude": "36.8",
        "longitude": "10.1",
    }
    return {**data, **overrides}


class AnimalValidationTests(TestCase):
    def test_observation_form_validates_required_fields_ranges_and_choices(self):
        self.assertTrue(ObservationForm(data=valid_observation_data()).is_valid())

        invalid_cases = [
            ({"cas": "inconnu"}, "cas"),
            ({"animal": ""}, "animal"),
            ({"nombre": "201"}, "nombre"),
            ({"nombre": "-1"}, "nombre"),
            ({"vu_le": (timezone.now() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")}, "vu_le"),
            ({"description": "court"}, "description"),
            ({"latitude": "nan"}, "latitude"),
            ({"latitude": "", "longitude": "10.1"}, "latitude"),
        ]
        for values, field in invalid_cases:
            with self.subTest(field=field, values=values):
                form = ObservationForm(data=valid_observation_data(**values))
                self.assertFalse(form.is_valid())
                self.assertIn(field, form.errors)

    def test_partner_form_trims_validates_phone_and_rejects_case_insensitive_duplicate(self):
        existing = Partenaire.objects.create(nom="Clinique du centre", telephone="71111222")
        base = {"nom": "  Association locale  ", "responsable": "  Amina Ben Ali  ", "telephone": "55123456", "categories": "blesse,errant"}
        form = PartenaireForm(data=base)
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data["nom"], "Association locale")
        self.assertEqual(form.cleaned_data["responsable"], "Amina Ben Ali")

        for phone in ("1234567", "123456789", "55 123456", "1234abcd"):
            with self.subTest(phone=phone):
                form = PartenaireForm(data={**base, "telephone": phone})
                self.assertFalse(form.is_valid())
                self.assertIn("telephone", form.errors)

        form = PartenaireForm(data={**base, "nom": " CLINIQUE DU CENTRE "})
        self.assertFalse(form.is_valid())
        self.assertIn("nom", form.errors)
        form = PartenaireForm(data={**base, "categories": "inconnu"})
        self.assertFalse(form.is_valid())
        self.assertIn("categories", form.errors)

        form = PartenaireForm(instance=existing, data={**base, "nom": "  Clinique du centre  "})
        self.assertTrue(form.is_valid(), form.errors)

    def test_admin_quick_update_rejects_invalid_values_without_mutating_record(self):
        self.assertFalse(ActionRapideForm({"statut": "unknown"}).is_valid())
        self.assertFalse(ActionRapideForm({"statut": "resolu"}).is_valid())
        self.assertFalse(ActionRapideForm({"partenaire": "999999"}).is_valid())
        self.assertFalse(ActionRapideForm({"next": "/animaux/gestion/"}).is_valid())
        resolved = Observation(statut="resolu")
        self.assertFalse(ActionRapideForm({"resultat": ""}, observation=resolved).is_valid())

    def test_observation_crud_partner_crud_and_admin_quick_update(self):
        citizen = User.objects.create_user(username="citoyen", password="Password123!")
        admin = User.objects.create_user(username="admin", password="Password123!", is_staff=True)
        self.client.force_login(citizen)

        response = self.client.post(reverse("animaux:create"), valid_observation_data())
        self.assertEqual(response.status_code, 302)
        observation = Observation.objects.get()

        response = self.client.post(reverse("animaux:update", args=[observation.pk]), valid_observation_data(espece="Chat blanc"))
        self.assertEqual(response.status_code, 302)
        observation.refresh_from_db()
        self.assertEqual(observation.espece, "Chat blanc")

        self.client.force_login(admin)
        self.client.post(reverse("animaux:rapide", args=[observation.pk]), {"statut": "unknown"})
        observation.refresh_from_db()
        self.assertEqual(observation.statut, "ouvert")
        self.client.post(reverse("animaux:rapide", args=[observation.pk]), {"statut": "en_cours"})
        observation.refresh_from_db()
        self.assertEqual(observation.statut, "en_cours")

        response = self.client.post(reverse("animaux:partenaire_create"), {
            "nom": "Vétérinaire municipal",
            "responsable": "Docteur Sami",
            "telephone": "71111222",
            "categories": "blesse",
        })
        self.assertEqual(response.status_code, 302)
        partner = Partenaire.objects.get(nom="Vétérinaire municipal")

        response = self.client.post(reverse("animaux:partenaire_update", args=[partner.pk]), {
            "nom": "Clinique municipale",
            "responsable": "Docteur Sami",
            "telephone": "71111222",
            "categories": "blesse",
        })
        self.assertEqual(response.status_code, 302)
        partner.refresh_from_db()
        self.assertEqual(partner.nom, "Clinique municipale")

        response = self.client.post(reverse("animaux:delete", args=[observation.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Observation.objects.filter(pk=observation.pk).exists())

        response = self.client.post(reverse("animaux:partenaire_delete", args=[partner.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Partenaire.objects.filter(pk=partner.pk).exists())
