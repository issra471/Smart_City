from django.conf import settings
from django.db import models
from django.utils import timezone


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
    banned_until = models.DateTimeField("Banni jusqu'au", blank=True, null=True)
    permanent_ban = models.BooleanField("Bannissement permanent", default=False)

    def sync_ban_state(self):
        """Réactive automatiquement un compte dont le bannissement est expiré."""
        if self.permanent_ban:
            if self.user.is_active:
                self.user.is_active = False
                self.user.save(update_fields=["is_active"])
            return True
        if self.banned_until and self.banned_until <= timezone.now():
            self.banned_until = None
            self.user.is_active = True
            self.save(update_fields=["banned_until"])
            self.user.save(update_fields=["is_active"])
            return False
        return bool(self.banned_until)

    def __str__(self):
        return f"Profil de {self.user.get_username()}"
