from django import forms

from .models import Equipe, Signalement

MAX_PHOTO = 8 * 1024 * 1024  # 8 Mo


def _check_photo(photo):
    if photo and getattr(photo, "size", 0) > MAX_PHOTO:
        raise forms.ValidationError("La photo est trop lourde (8 Mo maximum).")
    return photo


class SignalementForm(forms.ModelForm):
    """Création et modification par le citoyen : la position sur la carte est obligatoire."""

    latitude = forms.FloatField(min_value=-90, max_value=90, error_messages={"required": "Placez le problème sur la carte."})
    longitude = forms.FloatField(min_value=-180, max_value=180, error_messages={"required": "Placez le problème sur la carte."})

    class Meta:
        model = Signalement
        fields = ["categorie", "titre", "description", "adresse", "latitude", "longitude", "photo"]
        error_messages = {"categorie": {"required": "Choisissez une catégorie."}}

    def clean_titre(self):
        titre = self.cleaned_data["titre"].strip()
        if len(titre) < 4:
            raise forms.ValidationError("Un titre un peu plus précis, s'il vous plaît (4 caractères minimum).")
        return titre

    def clean_description(self):
        d = self.cleaned_data["description"].strip()
        if len(d) < 10:
            raise forms.ValidationError("Décrivez le problème en quelques mots (10 caractères minimum).")
        return d

    def clean_photo(self):
        return _check_photo(self.cleaned_data.get("photo"))


class GestionForm(forms.ModelForm):
    """Administration : statut, priorité, message au citoyen et photo après intervention."""

    commentaire = forms.CharField(label="Message au citoyen", required=False, widget=forms.Textarea)

    class Meta:
        model = Signalement
        fields = ["statut", "priorite", "equipe", "photo_apres"]
        labels = {"statut": "Statut", "equipe": "Équipe chargée"}

    def clean_photo_apres(self):
        return _check_photo(self.cleaned_data.get("photo_apres"))


class CategoriesField(forms.MultipleChoiceField):
    """Accepte aussi « voirie,eclairage » (envoyé par la page React en un seul champ)."""

    def to_python(self, value):
        if isinstance(value, str):
            value = [value]
        value = [v for item in (value or []) for v in str(item).split(",") if v]
        return super().to_python(value)


class EquipeForm(forms.ModelForm):
    categories = CategoriesField(label="Catégories traitées", choices=Signalement.CATEGORIES, required=False)

    class Meta:
        model = Equipe
        fields = ["nom", "responsable", "telephone", "categories"]

    def clean_nom(self):
        return self.cleaned_data["nom"].strip()
