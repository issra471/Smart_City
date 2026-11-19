from django import forms
from .models import Evenement


class EvenementForm(forms.ModelForm):
    class Meta:
        model = Evenement
        fields = ["titre", "description", "lieu", "date", "image"]
        widgets = {
            "titre": forms.TextInput(attrs={"placeholder": "Ex. Fête du printemps au parc"}),
            "description": forms.Textarea(attrs={"rows": 4, "placeholder": "Présentez l'événement, les activités prévues..."}),
            "lieu": forms.TextInput(attrs={"placeholder": "Ex. Place Centrale, Parc Municipal..."}),
            "date": forms.DateTimeInput(attrs={"type": "datetime-local"}),
        }
