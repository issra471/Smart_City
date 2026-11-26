from datetime import timedelta
from io import BytesIO
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from PIL import Image

from .forms import EvenementForm
from .models import Evenement
from core.validators import validate_image_upload


User = get_user_model()


def valid_event_data(**overrides):
    data = {
        "categorie": "culture",
        "titre": "Marché nocturne",
        "description": "Un rendez-vous festif au centre-ville.",
        "lieu": "Place centrale",
        "adresse": "Rue de la République",
        "latitude": "0",
        "longitude": "0",
        "date": timezone.now() + timedelta(days=2),
        "date_fin": timezone.now() + timedelta(days=2, hours=2),
    }
    return {**data, **overrides}


def image_file(name="event.png"):
    output = BytesIO()
    Image.new("RGB", (1, 1)).save(output, format="PNG")
    return SimpleUploadedFile(name, output.getvalue(), content_type="image/png")


class EvenementValidationTests(TestCase):
    def test_event_form_checks_required_text_dates_coordinates_and_image_extension(self):
        self.assertTrue(EvenementForm(data=valid_event_data()).is_valid())

        invalid_cases = [
            ({"titre": "   "}, "titre"),
            ({"description": "court"}, "description"),
            ({"lieu": " "}, "lieu"),
            ({"date": timezone.now() - timedelta(days=1)}, "date"),
            ({"date_fin": timezone.now() + timedelta(days=1)}, "date_fin"),
            ({"latitude": "0", "longitude": ""}, "longitude"),
            ({"latitude": "nan"}, "latitude"),
        ]
        for values, field in invalid_cases:
            with self.subTest(field=field, values=values):
                form = EvenementForm(data=valid_event_data(**values))
                self.assertFalse(form.is_valid())
                self.assertIn(field, form.errors)

        form = EvenementForm(data=valid_event_data(), files={"image": image_file("event.svg")})
        self.assertFalse(form.is_valid())
        self.assertIn("image", form.errors)

    def test_image_size_limit_is_enforced(self):
        accepted = SimpleNamespace(name="photo.png", size=8 * 1024 * 1024)
        rejected = SimpleNamespace(name="photo.png", size=8 * 1024 * 1024 + 1)
        self.assertIs(validate_image_upload(accepted), accepted)
        with self.assertRaises(ValidationError):
            validate_image_upload(rejected)

    def test_event_create_update_delete_and_participation(self):
        citizen = User.objects.create_user(username="citoyen", password="Password123!")
        other = User.objects.create_user(username="autre", password="Password123!")
        self.client.force_login(citizen)

        response = self.client.post(reverse("evenements:create"), valid_event_data())
        self.assertEqual(response.status_code, 302)
        event = Evenement.objects.get()
        self.assertEqual(event.organisateur, citizen)

        response = self.client.post(reverse("evenements:update", args=[event.pk]), valid_event_data(titre="Marché du soir"))
        self.assertEqual(response.status_code, 302)
        event.refresh_from_db()
        self.assertEqual(event.titre, "Marché du soir")

        self.client.force_login(other)
        response = self.client.post(reverse("evenements:participer", args=[event.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertTrue(event.participants.filter(pk=other.pk).exists())
        self.client.post(reverse("evenements:participer", args=[event.pk]))
        self.assertFalse(event.participants.filter(pk=other.pk).exists())

        self.client.force_login(citizen)
        response = self.client.post(reverse("evenements:delete", args=[event.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Evenement.objects.filter(pk=event.pk).exists())
