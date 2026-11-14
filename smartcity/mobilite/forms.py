from django import forms
from django.utils import timezone

from .models import Reservation


class ReservationForm(forms.ModelForm):
    date_depart = forms.DateTimeField(
        label="Date et heure de départ",
        widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        input_formats=["%Y-%m-%dT%H:%M"],
    )

    class Meta:
        model = Reservation
        fields = ["date_depart", "nombre"]
        labels = {"nombre": "Nombre d'unités"}

    def clean_date_depart(self):
        d = self.cleaned_data["date_depart"]
        if d < timezone.now():
            raise forms.ValidationError("La date de départ doit être dans le futur.")
        return d

    def clean_nombre(self):
        n = self.cleaned_data["nombre"]
        if n < 1:
            raise forms.ValidationError("Minimum 1.")
        return n
