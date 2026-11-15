from django import forms
from django.utils import timezone

from .models import Reservation, Station, Transport


class StationForm(forms.ModelForm):
    class Meta:
        model = Station
        fields = ["nom", "adresse", "latitude", "longitude"]

    def clean(self):
        data = super().clean()
        lat, lng = data.get("latitude"), data.get("longitude")
        if lat is not None and lng is not None and not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise forms.ValidationError("La position choisie sur la carte n'est pas valide.")
        return data


class TransportForm(forms.ModelForm):
    class Meta:
        model = Transport
        fields = ["station", "type", "unites_disponibles"]
        labels = {"station": "Station"}

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_staff = bool(user and user.is_staff)
        if not self.is_staff:  # le bus électrique est ajouté par l'administration seulement
            self.fields["type"].choices = [c for c in self.fields["type"].choices if c[0] not in Transport.TYPES_ADMIN]

    def clean_type(self):
        t = self.cleaned_data["type"]
        if t in Transport.TYPES_ADMIN and not self.is_staff:
            raise forms.ValidationError("Seul un administrateur peut ajouter un bus électrique.")
        return t

    def clean_unites_disponibles(self):
        n = self.cleaned_data["unites_disponibles"]
        if n < 1:
            raise forms.ValidationError("Minimum 1.")
        return n


class ReservationForm(forms.ModelForm):
    """Une balade : station de départ, station d'arrivée (différente), transport de la station de départ."""

    date_depart = forms.DateTimeField(
        label="Date et heure de départ",
        widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        input_formats=["%Y-%m-%dT%H:%M"],
    )

    class Meta:
        model = Reservation
        fields = ["depart", "arrivee", "transport", "date_depart", "nombre"]
        labels = {"depart": "Station de départ", "arrivee": "Station d'arrivée", "nombre": "Nombre d'unités"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["transport"].queryset = Transport.stock()
        self.fields["depart"].error_messages["required"] = "Choisissez une station de départ sur la carte."
        self.fields["arrivee"].error_messages["required"] = "Choisissez une station d'arrivée sur la carte."
        self.fields["transport"].error_messages["required"] = "Choisissez un transport."

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

    def clean(self):
        data = super().clean()
        depart, arrivee, transport = data.get("depart"), data.get("arrivee"), data.get("transport")
        if depart and arrivee and depart == arrivee:
            self.add_error("arrivee", "La station d'arrivée doit être différente de la station de départ.")
        if depart and transport and transport.station_id != depart.pk:
            self.add_error("transport", "Ce transport n'est pas dans la station de départ.")
        return data
