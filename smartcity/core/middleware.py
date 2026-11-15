"""Données partagées avec toutes les pages React (Inertia).

Les valeurs sont des fonctions : elles ne sont calculées que lorsqu'une page
Inertia est rendue, donc les pages Django classiques ne sont pas affectées
(les messages flash, par exemple, ne sont pas consommés par erreur).
"""
from django.contrib.messages import get_messages
from django.middleware.csrf import get_token
from django.urls import reverse
from inertia import share


def _auth(request):
    user = request.user
    if not user.is_authenticated:
        return {"user": None}
    name = user.get_full_name() or user.get_username()
    return {
        "user": {
            "username": user.get_username(),
            "first_name": user.first_name,
            "name": name,
            "initials": "".join(part[0] for part in name.split()[:2]).upper() or "?",
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    }


# Adresses fixes utilisées par le menu et les boutons des pages React.
_ROUTES = {
    "home": "home",
    "dashboard": "dashboard",
    "login": "accounts:login",
    "signup": "accounts:signup",
    "logout": "accounts:logout",
    "profile": "accounts:profile",
    "password_change": "accounts:password_change",
    "password_reset": "accounts:password_reset",
    "mobilite": "mobilite:list",
    "mobilite_create": "mobilite:create",
    "mobilite_transport_create": "mobilite:transport_create",
    "reservations": "mobilite:reservations",
    "admin_transports": "mobilite:admin_transports",
    "infrastructures": "infrastructures:list",
    "infrastructures_create": "infrastructures:create",
    "evenements": "evenements:list",
    "evenements_create": "evenements:create",
    "animaux": "animaux:list",
    "animaux_create": "animaux:create",
    "marketplace": "marketplace:list",
    "marketplace_create": "marketplace:create",
    "admin_dashboard": "accounts:admin_dashboard",
    "admin_users": "accounts:admin_users",
    "admin_modules": "accounts:admin_modules",
    "admin_reports": "accounts:admin_reports",
    "admin_events": "accounts:admin_events",
    "django_admin": "admin:index",
}


def _urls():
    return {key: reverse(name) for key, name in _ROUTES.items()}


def _flash(request):
    return [{"text": str(m), "level": m.level_tag, "tags": m.tags} for m in get_messages(request)]


def vite_manifest_reload(get_response):
    """En développement : relit la compilation React dès qu'elle change.

    django-vite garde en mémoire la liste des fichiers compilés lue au démarrage.
    Après un `npm run build`, les anciens fichiers n'existent plus et la page
    restait blanche tant qu'on ne redémarrait pas le serveur.
    """
    from django.conf import settings
    from django_vite.core.asset_loader import DjangoViteAssetLoader

    manifest = settings.DJANGO_VITE["default"]["manifest_path"]

    def stamp():
        try:
            return manifest.stat().st_mtime
        except OSError:
            return None

    # Date relevée au démarrage du serveur, au moment où django-vite lit la compilation.
    # (La relever à la première visite ne suffisait pas : une compilation faite entre
    # le démarrage et cette première visite passait inaperçue.)
    last = {"mtime": stamp()}
    # Version Inertia = date de la compilation : un onglet ouvert avec l'ancienne version
    # reçoit une réponse 409 et se recharge tout seul (sinon ses pages introuvables
    # bloquaient la navigation, par exemple après une réservation).
    settings.INERTIA_VERSION = str(last["mtime"])

    def middleware(request):
        mtime = stamp()
        if mtime != last["mtime"]:
            DjangoViteAssetLoader._instance = None
            last["mtime"] = mtime
            settings.INERTIA_VERSION = str(mtime)
        return get_response(request)

    return middleware


def inertia_shared_props(get_response):
    def middleware(request):
        share(
            request,
            auth=lambda: _auth(request),
            urls=_urls,
            csrf_token=lambda: get_token(request),
            flash=lambda: _flash(request),
        )
        return get_response(request)

    return middleware
