from django import forms
from datetime import timedelta

from django.utils import timezone

from .models import Observation, Partenaire

MAX_PHOTO = 8 * 1024 * 1024  # 8 Mo


def _check_photo(photo):
    if photo and getattr(photo, "size", 0) > MAX_PHOTO:
        raise forms.ValidationError("La photo est trop lourde (8 Mo maximum).")
    return photo


class ObservationForm(forms.ModelForm):
    """Signalement par un citoyen : le lieu sur la carte est obligatoire."""

    latitude = forms.FloatField(min_value=-90, max_value=90, error_messages={"required": "Placez l'animal sur la carte."})
    longitude = forms.FloatField(min_value=-180, max_value=180, error_messages={"required": "Placez l'animal sur la carte."})
    vu_le = forms.DateTimeField(label="Vu le", input_formats=["%Y-%m-%dT%H:%M"], widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"))

    class Meta:
        model = Observation
        fields = ["cas", "animal", "espece", "nombre", "vu_le", "description", "lieu", "latitude", "longitude", "photo"]
        error_messages = {"cas": {"required": "Choisissez le type de cas."}, "animal": {"required": "Choisissez l'animal."}}

    def clean_vu_le(self):
        d = self.cleaned_data["vu_le"]
        if d > timezone.now() + timedelta(minutes=5):
            raise forms.ValidationError("La date ne peut pas être dans le futur.")
        if d < timezone.now() - timedelta(days=30):
            raise forms.ValidationError("Signalez seulement ce que vous avez vu ces 30 derniers jours.")
        return d

    def clean_nombre(self):
        n = self.cleaned_data["nombre"]
        if not 1 <= n <= 200:
            raise forms.ValidationError("Entre 1 et 200 animaux.")
        return n

    def clean_photo(self):
        return _check_photo(self.cleaned_data.get("photo"))

    def clean(self):
        data = super().clean()
        # Un animal en difficulté doit être décrit pour que le partenaire le retrouve.
        if data.get("cas") in Observation.URGENCES and len((data.get("description") or "").strip()) < 10:
            self.add_error("description", "Décrivez la situation en quelques mots (10 caractères minimum) : état de l'animal, repère précis…")
        return data


class GestionForm(forms.ModelForm):
    """Administration d'un animal en difficulté."""

    commentaire = forms.CharField(label="Message au citoyen", required=False, widget=forms.Textarea)

    class Meta:
        model = Observation
        fields = ["statut", "priorite", "partenaire", "resultat"]
        labels = {"statut": "Statut", "partenaire": "Partenaire chargé", "resultat": "Résultat (quand c'est résolu)"}

    def clean(self):
        data = super().clean()
        statut, commentaire = data.get("statut"), (data.get("commentaire") or "").strip()
        if statut == "resolu" and not data.get("resultat"):
            self.add_error("resultat", "Indiquez le résultat : le citoyen le verra.")
        if statut == "rejete" and len(commentaire) < 3:
            self.add_error("commentaire", "Expliquez au citoyen pourquoi le signalement est rejeté.")
        if statut != "resolu":
            data["resultat"] = ""
        return data


class CategoriesField(forms.MultipleChoiceField):
    """Accepte « blesse,errant » (envoyé par la page React en un seul champ)."""

    def to_python(self, value):
        if isinstance(value, str):
            value = [value]
        value = [v for item in (value or []) for v in str(item).split(",") if v]
        return super().to_python(value)


class PartenaireForm(forms.ModelForm):
    categories = CategoriesField(label="Cas traités", choices=[c for c in Observation.CAS if c[0] in Observation.URGENCES], required=False)

    class Meta:
        model = Partenaire
        fields = ["nom", "responsable", "telephone", "categories"]

    def clean_nom(self):
        return self.cleaned_data["nom"].strip()
