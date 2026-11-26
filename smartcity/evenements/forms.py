import math

from django import forms
from django.utils import timezone

from core.validators import validate_image_upload
from .models import Evenement


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
        if len(d) > 5000:
            raise forms.ValidationError("La description ne peut pas dépasser 5 000 caractères.")
        return d

    def clean_lieu(self):
        lieu = self.cleaned_data["lieu"].strip()
        if len(lieu) < 2:
            raise forms.ValidationError("Le lieu doit faire au moins 2 caractères.")
        return lieu

    def clean_adresse(self):
        adresse = self.cleaned_data["adresse"].strip()
        if adresse and len(adresse) < 3:
            raise forms.ValidationError("L'adresse doit faire au moins 3 caractères.")
        return adresse

    def clean_latitude(self):
        latitude = self.cleaned_data.get("latitude")
        if latitude is not None and not math.isfinite(latitude):
            raise forms.ValidationError("La latitude doit être une valeur numérique valide.")
        return latitude

    def clean_longitude(self):
        longitude = self.cleaned_data.get("longitude")
        if longitude is not None and not math.isfinite(longitude):
            raise forms.ValidationError("La longitude doit être une valeur numérique valide.")
        return longitude

    def clean_date(self):
        d = self.cleaned_data["date"]
        if d and d < timezone.now():
            raise forms.ValidationError("La date doit être dans le futur.")
        return d

    def clean(self):
        data = super().clean()
        debut, fin = data.get("date"), data.get("date_fin")
        if fin and debut and fin <= debut:
            self.add_error("date_fin", "La date de fin doit être après le début.")
        if (data.get("latitude") is None) != (data.get("longitude") is None):
            message = "Indiquez les deux coordonnées ou retirez le point de la carte."
            if data.get("latitude") is not None:
                self.add_error("longitude", message)
            else:
                self.add_error("latitude", message)
        return data

    def clean_image(self):
        return validate_image_upload(self.cleaned_data.get("image"))
