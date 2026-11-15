"""Espace d'administration du site (frontend/pages/Admin/*). Réservé au staff."""
from datetime import timedelta
import json
from io import BytesIO
from urllib.parse import urlencode

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import Q
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from django.views import View
from django.views.generic import DetailView, ListView, TemplateView

from animaux.models import Observation
from core.inertia_utils import InertiaMixin, display_name, iso
from evenements.models import Evenement
from infrastructures.models import Signalement
from marketplace.models import Produit
from mobilite.models import Reservation, Station
from .models import UserProfile


USER_SORTS = {
    "name": ("first_name", "Nom"),
    "joined": ("date_joined", "Date d'inscription"),
    "status": ("is_active", "Statut"),
    "role": ("is_staff", "Rôle"),
}


class StaffRequiredMixin(UserPassesTestMixin):
    login_url = "accounts:login"

    def test_func(self):
        return self.request.user.is_staff


def account_payload(u):
    profile, _ = UserProfile.objects.get_or_create(user=u)
    profile.sync_ban_state()
    banned = profile.permanent_ban or bool(profile.banned_until)
    return {
        "id": u.pk,
        "username": u.get_username(),
        "name": display_name(u),
        "email": u.email,
        "is_active": u.is_active,
        "is_staff": u.is_staff,
        "is_superuser": u.is_superuser,
        "date_joined": iso(u.date_joined),
        "last_login": iso(u.last_login),
        "detail_url": reverse("accounts:admin_user_detail", args=[u.pk]),
        "is_banned": banned,
        "banned_until": iso(profile.banned_until),
        "permanent_ban": profile.permanent_ban,
        "action_url": reverse("accounts:admin_user_action", args=[u.pk]),
        "phone_number": profile.phone_number,
        "date_of_birth": iso(profile.date_of_birth),
        "address": profile.address,
        "city": profile.city,
    }


class AdminDashboardView(StaffRequiredMixin, InertiaMixin, TemplateView):
    component = "Admin/Dashboard"

    def get_props(self, context):
        users = get_user_model().objects
        return {
            "stats": {
                "users": users.count(),
                "active_users": users.filter(is_active=True).count(),
                "reports": Signalement.objects.count(),
                "open_reports": Signalement.objects.exclude(statut="resolu").count(),
                "events": Evenement.objects.count(),
                "stations": Station.objects.count(),
                "reservations": Reservation.objects.count(),
                "observations": Observation.objects.count(),
                "products": Produit.objects.count(),
            },
            "report_status": [
                {"key": key, "label": label, "count": Signalement.objects.filter(statut=key).count()}
                for key, label in Signalement.STATUTS
            ],
            "recent_users": [account_payload(u) for u in users.order_by("-date_joined")[:5]],
        }


class AdminUserListView(StaffRequiredMixin, InertiaMixin, ListView):
    model = get_user_model()
    component = "Admin/Users"
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.GET.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(username__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(email__icontains=query)
            )
        sort = self.request.GET.get("sort", "name")
        field = USER_SORTS.get(sort, USER_SORTS["name"])[0]
        return queryset.order_by(field, "username")

    def get_props(self, context):
        page = context["page_obj"]
        sort = self.request.GET.get("sort", "name")
        params = {"sort": sort}
        if self.request.GET.get("q", "").strip():
            params["q"] = self.request.GET["q"].strip()
        return {
            "users": [account_payload(u) for u in page.object_list],
            "query": self.request.GET.get("q", ""),
            "sort": sort,
            "export_url": f"{reverse('accounts:admin_users_export')}?{urlencode(params)}",
            "page": {"number": page.number, "pages": page.paginator.num_pages, "count": page.paginator.count},
        }


class AdminUserExportPDFView(StaffRequiredMixin, View):
    def get(self, request):
        list_view = AdminUserListView()
        list_view.request = request
        users = list_view.get_queryset()
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        buffer = BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=14 * mm,
            leftMargin=14 * mm,
            topMargin=14 * mm,
            bottomMargin=14 * mm,
        )
        styles = getSampleStyleSheet()
        body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10, alignment=TA_LEFT)
        title = ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=18, leading=22)
        rows = [["Nom", "Identifiant", "E-mail", "Statut", "Rôle", "Inscription"]]
        for user in users:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.sync_ban_state()
            status = "Banni" if profile.permanent_ban or profile.banned_until else ("Actif" if user.is_active else "Désactivé")
            role = "Super-administrateur" if user.is_superuser else ("Administrateur" if user.is_staff else "Citoyen")
            rows.append([
                Paragraph(display_name(user), body),
                Paragraph(user.get_username(), body),
                Paragraph(user.email or "—", body),
                status,
                role,
                iso(user.date_joined)[:10],
            ])

        story = [Paragraph("Liste des utilisateurs", title), Spacer(1, 6), Paragraph(f"{len(rows) - 1} compte(s)", body), Spacer(1, 10)]
        table = Table(rows, colWidths=[42 * mm, 36 * mm, 64 * mm, 28 * mm, 48 * mm, 30 * mm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#087a5b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d7ded9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f6f2")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        document.build(story)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="utilisateurs.pdf"'
        return response


class AdminUserDetailView(StaffRequiredMixin, InertiaMixin, DetailView):
    model = get_user_model()
    component = "Admin/UserDetail"

    def get_props(self, context):
        u = self.object
        return {
            "account": account_payload(u),
            "permissions": {
                "can_manage_roles": self.request.user.is_superuser and u.pk != self.request.user.pk,
                "can_manage_ban": u.pk != self.request.user.pk,
            },
            "activity": {
                "reservations": Reservation.objects.filter(user=u).count(),
                "reports": Signalement.objects.filter(user=u).count(),
                "observations": Observation.objects.filter(user=u).count(),
                "events": Evenement.objects.filter(organisateur=u).count(),
                "products": Produit.objects.filter(vendeur=u).count(),
            },
        }


class AdminUserActionView(StaffRequiredMixin, View):
    def post(self, request, pk):
        user = get_user_model().objects.filter(pk=pk).first()
        if user is None:
            return HttpResponseBadRequest("Utilisateur introuvable.")
        if user.pk == request.user.pk:
            return HttpResponseBadRequest("Vous ne pouvez pas modifier votre propre compte depuis cet espace.")

        data = request.POST
        if not data and request.body:
            try:
                data = json.loads(request.body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return HttpResponseBadRequest("Le format de la requête est invalide.")
        action = data.get("action")
        profile, _ = UserProfile.objects.get_or_create(user=user)

        if action in {"promote_admin", "remove_admin"}:
            if not request.user.is_superuser:
                return HttpResponseBadRequest("Seul un super-administrateur peut gérer les administrateurs.")
            if action == "remove_admin" and user.is_superuser:
                return HttpResponseBadRequest("Un super-administrateur ne peut pas être rétrogradé ici.")
            user.is_staff = action == "promote_admin"
            user.save(update_fields=["is_staff"])
            messages.success(request, "Le rôle administrateur a été mis à jour.")
        elif action == "ban_temporary":
            if user.is_staff:
                return HttpResponseBadRequest("Les comptes administrateurs ne peuvent pas être bannis.")
            try:
                hours = int(data.get("duration_hours", ""))
            except ValueError:
                return HttpResponseBadRequest("La durée du bannissement est invalide.")
            if hours < 1 or hours > 8760:
                return HttpResponseBadRequest("La durée doit être comprise entre 1 heure et 1 an.")
            if user.is_superuser and not request.user.is_superuser:
                return HttpResponseBadRequest("Seul un super-administrateur peut bannir un super-administrateur.")
            profile.banned_until = timezone.now() + timedelta(hours=hours)
            profile.permanent_ban = False
            profile.save(update_fields=["banned_until", "permanent_ban"])
            user.is_active = False
            user.save(update_fields=["is_active"])
            messages.success(request, "Le bannissement temporaire a été appliqué.")
        elif action == "ban_permanent":
            if user.is_staff:
                return HttpResponseBadRequest("Les comptes administrateurs ne peuvent pas être bannis.")
            if user.is_superuser and not request.user.is_superuser:
                return HttpResponseBadRequest("Seul un super-administrateur peut bannir un super-administrateur.")
            profile.banned_until = None
            profile.permanent_ban = True
            profile.save(update_fields=["banned_until", "permanent_ban"])
            user.is_active = False
            user.save(update_fields=["is_active"])
            messages.success(request, "Le bannissement permanent a été appliqué.")
        elif action == "unban":
            profile.banned_until = None
            profile.permanent_ban = False
            profile.save(update_fields=["banned_until", "permanent_ban"])
            user.is_active = True
            user.save(update_fields=["is_active"])
            messages.success(request, "Le compte a été débanni.")
        else:
            return HttpResponseBadRequest("Action inconnue.")

        return redirect("accounts:admin_user_detail", pk=user.pk)


class AdminModuleOverviewView(StaffRequiredMixin, InertiaMixin, TemplateView):
    component = "Admin/Modules"

    def get_props(self, context):
        rows = [
            ("Signalements", "infrastructures", Signalement.objects.count(), reverse("accounts:admin_reports"), False),
            ("Événements", "evenements", Evenement.objects.count(), reverse("accounts:admin_events"), False),
            ("Mobilité", "mobilite", Station.objects.count(), reverse("admin:mobilite_station_changelist"), True),
            ("Observations animales", "animaux", Observation.objects.count(), reverse("admin:animaux_observation_changelist"), True),
            ("Marché local", "marketplace", Produit.objects.count(), reverse("admin:marketplace_produit_changelist"), True),
        ]
        return {"modules": [{"label": l, "ns": ns, "count": c, "url": url, "external": ext} for l, ns, c, url, ext in rows]}


class AdminSectionList(StaffRequiredMixin, InertiaMixin, ListView):
    """Tableau de suivi d'un module (signalements, événements)."""

    component = "Admin/ModuleList"
    section_title = section_description = admin_model_url = ""

    def row(self, o):
        raise NotImplementedError

    def get_props(self, context):
        return {
            "title": self.section_title,
            "description": self.section_description,
            "admin_url": reverse(self.admin_model_url),
            "rows": [self.row(o) for o in context["object_list"]],
        }


class AdminReportListView(AdminSectionList):
    queryset = Signalement.objects.select_related("user")
    section_title = "Signalements"
    section_description = "Suivez les problèmes signalés dans l'espace public."
    admin_model_url = "admin:infrastructures_signalement_changelist"

    def row(self, o):
        return {
            "id": o.pk,
            "title": o.titre,
            "detail": o.get_categorie_display(),
            "status": {"key": o.statut, "label": o.get_statut_display()},
            "author": display_name(o.user),
            "date": iso(o.created_at),
            "manage_url": reverse("admin:infrastructures_signalement_change", args=[o.pk]),
        }


class AdminEventListView(AdminSectionList):
    queryset = Evenement.objects.select_related("organisateur")
    section_title = "Événements"
    section_description = "Consultez les événements publiés par les organisateurs."
    admin_model_url = "admin:evenements_evenement_changelist"

    def row(self, o):
        return {
            "id": o.pk,
            "title": o.titre,
            "detail": o.lieu,
            "status": None,
            "author": display_name(o.organisateur),
            "date": iso(o.date),
            "manage_url": reverse("admin:evenements_evenement_change", args=[o.pk]),
        }
