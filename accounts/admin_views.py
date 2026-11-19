"""Espace d'administration du site (frontend/pages/Admin/*). Réservé au staff."""
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import Q
from django.urls import reverse
from django.utils import timezone
from django.views.generic import DetailView, ListView, TemplateView, UpdateView

from animaux.models import Observation
from core.inertia_utils import InertiaFormMixin, InertiaMixin, display_name, iso
from evenements.models import Evenement
from infrastructures.models import Signalement
from marketplace.models import Produit
from mobilite.models import Reservation, Station


class StaffRequiredMixin(UserPassesTestMixin):
    login_url = "accounts:login"

    def test_func(self):
        return self.request.user.is_staff


def account_payload(u):
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
        "edit_url": reverse("accounts:admin_user_edit", args=[u.pk]),
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
        queryset = super().get_queryset().order_by("username")
        query = self.request.GET.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(username__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(email__icontains=query)
            )
        return queryset

    def get_props(self, context):
        page = context["page_obj"]
        return {
            "users": [account_payload(u) for u in page.object_list],
            "query": self.request.GET.get("q", ""),
            "page": {"number": page.number, "pages": page.paginator.num_pages, "count": page.paginator.count},
        }


class AdminUserDetailView(StaffRequiredMixin, InertiaMixin, DetailView):
    model = get_user_model()
    component = "Admin/UserDetail"

    def get_props(self, context):
        u = self.object
        return {
            "account": account_payload(u),
            "activity": {
                "reservations": Reservation.objects.filter(user=u).count(),
                "reports": Signalement.objects.filter(user=u).count(),
                "observations": Observation.objects.filter(user=u).count(),
                "events": Evenement.objects.filter(organisateur=u).count(),
                "products": Produit.objects.filter(vendeur=u).count(),
            },
        }


class AdminUserUpdateView(StaffRequiredMixin, InertiaFormMixin, UpdateView):
    model = get_user_model()
    fields = ["first_name", "last_name", "email", "is_active", "is_staff"]
    component = "Admin/UserForm"

    def get_success_url(self):
        return reverse("accounts:admin_user_detail", kwargs={"pk": self.object.pk})

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        if not self.request.user.is_superuser:
            form.fields.pop("is_staff", None)
        return form

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, "Utilisateur mis à jour.")
        return response

    def get_props(self, context):
        # Relu en base : après une saisie invalide, self.object porte les valeurs non enregistrées.
        return {**super().get_props(context), "account": account_payload(get_user_model().objects.get(pk=self.object.pk))}


class AdminModuleOverviewView(StaffRequiredMixin, InertiaMixin, TemplateView):
    component = "Admin/Modules"

    def get_props(self, context):
        rows = [
            ("Signalements", "infrastructures", Signalement.objects.count(), reverse("infrastructures:admin"), False),
            ("Événements", "evenements", Evenement.objects.count(), reverse("accounts:admin_events"), False),
            ("Mobilité", "mobilite", Station.objects.count(), reverse("mobilite:admin"), False),
            ("Animaux", "animaux", Observation.objects.count(), reverse("animaux:admin"), False),
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


class AdminEventListView(StaffRequiredMixin, InertiaMixin, ListView):
    model = Evenement
    component = "Admin/Evenements"

    def get_queryset(self):
        return Evenement.objects.select_related("organisateur").prefetch_related("participants").order_by("-date")

    def get_props(self, context):
        now = timezone.now()
        events = list(context["object_list"])
        total_participants = sum(e.participants.count() for e in events)
        upcoming_count = sum(1 for e in events if e.date >= now)

        return {
            "events": [
                {
                    "id": e.pk,
                    "title": e.titre,
                    "description": e.description,
                    "place": e.lieu,
                    "date": iso(e.date),
                    "author": display_name(e.organisateur),
                    "image": e.card_image,
                    "participants_count": e.participants.count(),
                    "is_upcoming": e.date >= now,
                    "detail_url": reverse("evenements:detail", args=[e.pk]),
                    "edit_url": reverse("evenements:update", args=[e.pk]),
                    "delete_url": reverse("evenements:delete", args=[e.pk]),
                }
                for e in events
            ],
            "stats": {
                "total": len(events),
                "upcoming": upcoming_count,
                "past": len(events) - upcoming_count,
                "participants": total_participants,
            },
            "create_url": reverse("evenements:create"),
            "back_url": reverse("accounts:admin_dashboard"),
        }
