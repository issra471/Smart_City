from django.contrib.auth import views as auth_views
from django.urls import path

from . import views
from .admin_views import (
    AdminDashboardView,
    AdminEventListView,
    AdminModuleOverviewView,
    AdminReportListView,
    AdminUserDetailView,
    AdminUserActionView,
    AdminUserExportPDFView,
    AdminUserListView,
)

app_name = "accounts"
urlpatterns = [
    path("connexion/", views.LoginView.as_view(), name="login"),
    path("deconnexion/", auth_views.LogoutView.as_view(), name="logout"),
    path("inscription/", views.SignUpView.as_view(), name="signup"),
    path("profil/", views.ProfileUpdateView.as_view(), name="profile"),
    path("profil/supprimer/", views.DeleteAccountView.as_view(), name="delete_account"),
    path("parametres/", views.ProfileUpdateView.as_view(), name="settings"),
    path("mot-de-passe/modifier/", views.PasswordChangeView.as_view(), name="password_change"),
    path("administration/", AdminDashboardView.as_view(), name="admin_dashboard"),
    path("administration/utilisateurs/", AdminUserListView.as_view(), name="admin_users"),
    path("administration/utilisateurs/export-pdf/", AdminUserExportPDFView.as_view(), name="admin_users_export"),
    path("administration/utilisateurs/<int:pk>/", AdminUserDetailView.as_view(), name="admin_user_detail"),
    path("administration/utilisateurs/<int:pk>/actions/", AdminUserActionView.as_view(), name="admin_user_action"),
    path("administration/modules/", AdminModuleOverviewView.as_view(), name="admin_modules"),
    path("administration/signalements/", AdminReportListView.as_view(), name="admin_reports"),
    path("administration/evenements/", AdminEventListView.as_view(), name="admin_events"),
    path("mot-de-passe-oublie/", views.PasswordResetView.as_view(), name="password_reset"),
    path("mot-de-passe-oublie/envoye/", views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("mot-de-passe/termine/", views.PasswordResetCompleteView.as_view(), name="password_reset_complete"),
    path("mot-de-passe/<uidb64>/<token>/", views.PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
