from django import forms
from django.contrib.auth import get_user_model

from .models import UserProfile


class ProfileForm(forms.ModelForm):
    first_name = forms.CharField(label="Prénom", max_length=150)
    last_name = forms.CharField(label="Nom", max_length=150)
    email = forms.EmailField(label="Adresse électronique")
    phone_number = forms.CharField(
        label="Téléphone",
        max_length=30,
        required=False,
        widget=forms.TextInput(attrs={"type": "tel", "autocomplete": "tel"}),
    )
    date_of_birth = forms.DateField(
        label="Date de naissance",
        required=False,
        widget=forms.DateInput(attrs={"type": "date", "autocomplete": "bday"}),
    )
    address = forms.CharField(
        label="Adresse complète",
        max_length=255,
        required=False,
    )
    city = forms.CharField(
        label="Ville / Commune",
        max_length=120,
        required=False,
    )

    class Meta:
        model = get_user_model()
        fields = ["first_name", "last_name", "email"]

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user")
        super().__init__(*args, **kwargs)
        self.user_profile, _ = UserProfile.objects.get_or_create(user=user)
        self.fields["phone_number"].initial = self.user_profile.phone_number
        self.fields["date_of_birth"].initial = self.user_profile.date_of_birth
        self.fields["address"].initial = self.user_profile.address
        self.fields["city"].initial = self.user_profile.city

    def save(self, commit=True):
        user = super().save(commit=commit)
        self.user_profile.phone_number = self.cleaned_data["phone_number"]
        self.user_profile.date_of_birth = self.cleaned_data["date_of_birth"]
        self.user_profile.address = self.cleaned_data["address"]
        self.user_profile.city = self.cleaned_data["city"]
        if commit:
            self.user_profile.save()
        return user
