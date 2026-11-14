from django.contrib import messages
from django.contrib.auth import get_user_model, login
from django.contrib.auth import views as auth_views
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse, reverse_lazy
from django.views.generic import CreateView, UpdateView

from core.inertia_utils import InertiaFormMixin, InertiaMixin, iso
from .forms import ProfileForm
from .models import UserProfile


# --- Connexion / inscription (frontend/pages/Auth/*) ----------------------

class LoginView(InertiaFormMixin, auth_views.LoginView):
    component = "Auth/Login"


class SignUpView(InertiaFormMixin, CreateView):
    form_class = UserCreationForm
    component = "Auth/Signup"
    success_url = reverse_lazy("dashboard")

    def form_valid(self, form):
        response = super().form_valid(form)
        login(self.request, self.object)
        messages.success(self.request, "Bienvenue à Valmont ! Votre compte est créé.")
        return response


# --- Mot de passe oublié --------------------------------------------------

class PasswordResetView(InertiaFormMixin, auth_views.PasswordResetView):
    component = "Auth/PasswordReset"
    email_template_name = "registration/password_reset_email.html"
    subject_template_name = "registration/password_reset_subject.txt"
    success_url = reverse_lazy("accounts:password_reset_done")


class MessagePage(InertiaMixin):
    """Page d'information simple : un titre, un texte, un bouton."""

    component = "Auth/Message"
    eyebrow = title = text = action = ""
    action_url = "accounts:login"

    def get_props(self, context):
        return {
            "eyebrow": self.eyebrow,
            "title": self.title,
            "text": self.text,
            "action": {"label": self.action, "url": reverse(self.action_url)},
        }


class PasswordResetDoneView(MessagePage, auth_views.PasswordResetDoneView):
    eyebrow = "Vérifiez votre boîte mail"
    title = "Lien envoyé"
    text = "Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être envoyé."
    action = "Retour à la connexion"


class PasswordResetConfirmView(InertiaFormMixin, auth_views.PasswordResetConfirmView):
    component = "Auth/PasswordResetConfirm"
    success_url = reverse_lazy("accounts:password_reset_complete")

    def get_props(self, context):
        return {**super().get_props(context), "validlink": bool(context.get("validlink"))}


class PasswordResetCompleteView(MessagePage, auth_views.PasswordResetCompleteView):
    eyebrow = "Sécurité du compte"
    title = "Mot de passe modifié"
    text = "Votre nouveau mot de passe est enregistré."
    action = "Se connecter"


# --- Profil (frontend/pages/Account/*) ------------------------------------

class ProfileUpdateView(LoginRequiredMixin, InertiaFormMixin, UpdateView):
    model = get_user_model()
    form_class = ProfileForm
    component = "Account/Profile"
    success_url = reverse_lazy("accounts:profile")

    def get_object(self, queryset=None):
        return self.request.user

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs

    def get_props(self, context):
        # On relit l'utilisateur en base : si le formulaire est invalide,
        # `request.user` contient les valeurs saisies non enregistrées.
        user = get_user_model().objects.get(pk=self.request.user.pk)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return {
            **super().get_props(context),
            "account": {
                "username": user.get_username(),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone_number": profile.phone_number,
                "date_of_birth": iso(profile.date_of_birth),
                "address": profile.address,
                "city": profile.city,
                "date_joined": iso(user.date_joined),
                "is_staff": user.is_staff,
            },
        }

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(
            self.request,
            "Votre profil a été mis à jour avec succès.",
            extra_tags="profile-success",
        )
        return response


class PasswordChangeView(InertiaFormMixin, auth_views.PasswordChangeView):
    component = "Account/PasswordChange"
    success_url = reverse_lazy("accounts:profile")

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Votre mot de passe a été modifié.")
        return response
