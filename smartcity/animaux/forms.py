import math
from datetime import timedelta

from django import forms
from django.utils import timezone

from core.validators import validate_image_upload, validate_tunisian_phone
from .models import Observation, Partenaire


class ObservationForm(forms.ModelForm):
    """Signalement par un citoyen : le lieu sur la carte est obligatoire."""

    latitude = forms.FloatField(min_value=-90, max_value=90, error_messages={"required": "Placez l'animal sur la carte."})
    longitude = forms.FloatField(min_value=-180, max_value=180, error_messages={"required": "Placez l'animal sur la carte."})
    vu_le = forms.DateTimeField(label="Vu le", input_formats=["%Y-%m-%dT%H:%M"], widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"))
    description = forms.CharField(required=False, max_length=2000, widget=forms.Textarea)

    class Meta:
        model = Observation
        fields = ["cas", "animal", "espece", "nombre", "vu_le", "description", "lieu", "latitude", "longitude", "photo"]
        error_messages = {"cas": {"required": "Choisissez le type de cas."}, "animal": {"required": "Choisissez l'animal."}}

    def clean_vu_le(self):
        d = self.cleaned_data["vu_le"]
        if d > timezone.now():
            raise forms.ValidationError("La date ne peut pas être dans le futur.")
        if d < timezone.now() - timedelta(days=30):
            raise forms.ValidationError("Signalez seulement ce que vous avez vu ces 30 derniers jours.")
        return d

    def clean_nombre(self):
        n = self.cleaned_data["nombre"]
        if not 1 <= n <= 200:
            raise forms.ValidationError("Entre 1 et 200 animaux.")
        return n

    def clean_espece(self):
        espece = self.cleaned_data["espece"].strip()
        if espece and len(espece) < 2:
            raise forms.ValidationError("La description courte doit faire au moins 2 caractères.")
        return espece

    def clean_lieu(self):
        lieu = self.cleaned_data["lieu"].strip()
        if lieu and len(lieu) < 3:
            raise forms.ValidationError("Le repère doit faire au moins 3 caractères.")
        return lieu

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

    def clean_photo(self):
        return validate_image_upload(self.cleaned_data.get("photo"), label="La photo")

    def clean(self):
        data = super().clean()
        description = (data.get("description") or "").strip()
        if data.get("cas") in Observation.URGENCES and len(description) < 10:
            self.add_error("description", "Décrivez la situation en quelques mots (10 caractères minimum) : état de l'animal, repère précis…")
        latitude, longitude = data.get("latitude"), data.get("longitude")
        if (latitude is None) != (longitude is None):
            field = "longitude" if latitude is not None else "latitude"
            self.add_error(field, "Indiquez les deux coordonnées de l'animal.")
        return data


class GestionForm(forms.ModelForm):
    """Administration d'un animal en difficulté."""

    commentaire = forms.CharField(label="Message au citoyen", required=False, max_length=2000, widget=forms.Textarea)

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


class ActionRapideForm(forms.Form):
    """Valide les mises à jour d'un seul champ envoyées depuis le tableau admin."""

    statut = forms.ChoiceField(choices=[("", "---------"), *[c for c in Observation.STATUTS if c[0] not in {"rejete", "resolu"}]], required=False)
    priorite = forms.ChoiceField(choices=[("", "---------"), *Observation.PRIORITES], required=False)
    partenaire = forms.ModelChoiceField(queryset=Partenaire.objects.all(), required=False)
    resultat = forms.ChoiceField(choices=[("", "---------"), *Observation.RESULTATS], required=False)

    def __init__(self, *args, observation=None, **kwargs):
        self.observation = observation
        super().__init__(*args, **kwargs)

    def clean(self):
        data = super().clean()
        for name in ("statut", "priorite"):
            if name in self.data and not data.get(name):
                self.add_error(name, "Choisissez une valeur valide.")
        if "resultat" in self.data:
            if not self.observation or self.observation.statut != "resolu":
                self.add_error("resultat", "Le résultat se modifie uniquement pour un signalement résolu.")
            elif not data.get("resultat"):
                self.add_error("resultat", "Un résultat est obligatoire pour un signalement résolu.")
        if not any(name in self.data for name in self.fields):
            raise forms.ValidationError("Choisissez au moins une valeur à modifier.")
        return data


class CategoriesField(forms.MultipleChoiceField):
    """Accepte « blesse,errant » (envoyé par la page React en un seul champ)."""

    def to_python(self, value):
        if isinstance(value, str):
            value = [value]
        value = [v.strip() for item in (value or []) for v in str(item).split(",") if v.strip()]
        return super().to_python(value)


class PartenaireForm(forms.ModelForm):
    categories = CategoriesField(label="Cas traités", choices=[c for c in Observation.CAS if c[0] in Observation.URGENCES], required=False)

    class Meta:
        model = Partenaire
        fields = ["nom", "responsable", "telephone", "categories"]

    def clean_nom(self):
        nom = self.cleaned_data["nom"].strip()
        if len(nom) < 2:
            raise forms.ValidationError("Le nom doit faire au moins 2 caractères.")
        if Partenaire.objects.filter(nom__iexact=nom).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Un partenaire portant ce nom existe déjà.")
        return nom

    def clean_responsable(self):
        responsable = self.cleaned_data["responsable"].strip()
        if responsable and len(responsable) < 2:
            raise forms.ValidationError("Le nom du responsable doit faire au moins 2 caractères.")
        return responsable

    def clean_telephone(self):
        return validate_tunisian_phone(self.cleaned_data.get("telephone", ""))
