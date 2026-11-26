import re
from decimal import Decimal
from django import forms

from .models import Produit

MAX_PHOTO = 8 * 1024 * 1024


class ProduitForm(forms.ModelForm):
    class Meta:
        model = Produit
        fields = ["categorie", "titre", "description", "prix", "quantite", "unite", "telephone", "image"]
        error_messages = {
            "categorie": {"required": "Choisissez une catégorie."},
            "titre": {"required": "Le titre est obligatoire."},
            "description": {"required": "La description est obligatoire."},
            "prix": {
                "required": "Le prix est obligatoire.",
                "invalid": "Le prix doit être composé uniquement de chiffres.",
            },
            "quantite": {
                "required": "La quantité est obligatoire.",
                "invalid": "La quantité doit être composée uniquement de chiffres.",
            },
            "unite": {"required": "Choisissez une unité."},
        }

    def clean_titre(self):
        t = self.cleaned_data["titre"].strip()
        if len(t) < 4:
            raise forms.ValidationError("Le titre doit faire au moins 4 caractères.")
        return t

    def clean_description(self):
        d = self.cleaned_data["description"].strip()
        if len(d) < 10:
            raise forms.ValidationError("Décrivez le produit en quelques mots (10 caractères minimum).")
        return d

    def clean_prix(self):
        raw = str(self.data.get("prix", "")).strip().replace(",", ".")
        if raw and not re.fullmatch(r"[0-9]+(\.[0-9]{1,2})?", raw):
            raise forms.ValidationError("Le prix doit être composé uniquement de chiffres (ex. 12.50).")
        p = self.cleaned_data.get("prix")
        if p is None:
            raise forms.ValidationError("Le prix doit être composé uniquement de chiffres.")
        if p <= Decimal("0"):
            raise forms.ValidationError("Le prix doit être supérieur à 0.")
        return p

    def clean_quantite(self):
        raw = str(self.data.get("quantite", "")).strip()
        if raw and not re.fullmatch(r"[0-9]+", raw):
            raise forms.ValidationError("La quantité doit être composée uniquement de chiffres.")
        q = self.cleaned_data.get("quantite")
        if q is None or q < 0:
            raise forms.ValidationError("La quantité doit être composée uniquement de chiffres.")
        if not self.instance.pk and q < 1:
            raise forms.ValidationError("La quantité initiale doit être supérieure à 0.")
        return q

    def clean_telephone(self):
        tel = self.cleaned_data.get("telephone", "").strip()
        if tel:
            if re.search(r"[^0-9]", tel):
                raise forms.ValidationError(
                    "Le numéro de téléphone ne doit contenir que des chiffres (pas de lettres ni de caractères spéciaux)."
                )
            if len(tel) != 8:
                raise forms.ValidationError("Le numéro de téléphone doit être composé de 8 chiffres exactement.")
        return tel

    def clean_image(self):
        img = self.cleaned_data.get("image")
        if img and getattr(img, "size", 0) > MAX_PHOTO:
            raise forms.ValidationError("L'image est trop lourde (8 Mo maximum).")
        return img
