from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    phone_number = models.CharField("Téléphone", max_length=30, blank=True)
    date_of_birth = models.DateField("Date de naissance", blank=True, null=True)
    address = models.CharField("Adresse complète", max_length=255, blank=True)
    city = models.CharField("Ville / Commune", max_length=120, blank=True)

    def __str__(self):
        return f"Profil de {self.user.get_username()}"
