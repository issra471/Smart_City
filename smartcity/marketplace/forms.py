from django import forms

from .models import Produit

MAX_PHOTO = 8 * 1024 * 1024


class ProduitForm(forms.ModelForm):
    class Meta:
        model = Produit
        fields = ["categorie", "titre", "description", "prix", "telephone", "image"]
        error_messages = {"categorie": {"required": "Choisissez une catégorie."}}

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
        p = self.cleaned_data["prix"]
        if p is not None and p <= 0:
            raise forms.ValidationError("Le prix doit être positif.")
        return p

    def clean_image(self):
        img = self.cleaned_data.get("image")
        if img and getattr(img, "size", 0) > MAX_PHOTO:
            raise forms.ValidationError("L'image est trop lourde (8 Mo maximum).")
        return img
