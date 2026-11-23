from django import forms
from django.utils import timezone

from .models import Evenement

MAX_PHOTO = 8 * 1024 * 1024


class EvenementForm(forms.ModelForm):
    latitude = forms.FloatField(min_value=-90, max_value=90, required=False)
    longitude = forms.FloatField(min_value=-180, max_value=180, required=False)

    class Meta:
        model = Evenement
        fields = ["categorie", "titre", "description", "lieu", "adresse", "latitude", "longitude", "date", "date_fin", "image"]
        error_messages = {"categorie": {"required": "Choisissez une catégorie."}}

    def clean_titre(self):
        t = self.cleaned_data["titre"].strip()
        if len(t) < 4:
            raise forms.ValidationError("Le titre doit faire au moins 4 caractères.")
        return t

    def clean_description(self):
        d = self.cleaned_data["description"].strip()
        if len(d) < 10:
            raise forms.ValidationError("Décrivez l'événement en quelques mots (10 caractères minimum).")
        return d

    def clean_date(self):
        d = self.cleaned_data["date"]
        if not self.instance.pk and d and d < timezone.now():
            raise forms.ValidationError("La date doit être dans le futur.")
        return d

    def clean_date_fin(self):
        fin = self.cleaned_data.get("date_fin")
        debut = self.cleaned_data.get("date")
        if fin and debut and fin <= debut:
            raise forms.ValidationError("La date de fin doit être après le début.")
        return fin

    def clean_image(self):
        img = self.cleaned_data.get("image")
        if img and getattr(img, "size", 0) > MAX_PHOTO:
            raise forms.ValidationError("L'image est trop lourde (8 Mo maximum).")
        return img
