from django import forms
from .models import Produit


class ProduitForm(forms.ModelForm):
    class Meta:
        model = Produit
        fields = ["titre", "description", "prix", "quantite", "unite", "image"]
        widgets = {
            "titre": forms.TextInput(attrs={"placeholder": "Ex. Miel de fleurs sauvages"}),
            "description": forms.Textarea(attrs={"rows": 4, "placeholder": "Décrivez votre produit, sa provenance, ses bienfaits..."}),
            "prix": forms.NumberInput(attrs={"min": "0.01", "step": "0.01", "placeholder": "Ex. 18.50"}),
            "quantite": forms.NumberInput(attrs={"min": "0.01", "step": "0.01", "placeholder": "Ex. 10"}),
            "unite": forms.Select(),
        }
