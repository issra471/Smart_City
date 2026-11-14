import mimetypes
import os
from pathlib import Path

# Windows associe parfois .js à "text/plain" dans le registre : les navigateurs
# refusent alors d'exécuter les modules JS (React). On force le bon type.
mimetypes.add_type("text/javascript", ".js", True)
mimetypes.add_type("text/css", ".css", True)

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "change-me-in-production"
DEBUG = True
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Front React (Inertia + Vite)
    "django_vite",
    "inertia",
    # Apps Smart City
    "core",
    "accounts",
    "mobilite",
    "infrastructures",
    "evenements",
    "animaux",
    "marketplace",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "inertia.middleware.InertiaMiddleware",
    "core.middleware.inertia_shared_props",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Tunis"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static", ("dist", BASE_DIR / "frontend_dist")]

# --- Front React ---------------------------------------------------------
# `npm run dev`   -> VITE_DEV=1 : Django charge React depuis Vite (rechargement instantané)
# sinon           -> Django sert les fichiers compilés par `npm run build`
DJANGO_VITE = {
    "default": {
        "dev_mode": os.environ.get("VITE_DEV") == "1",
        "static_url_prefix": "dist",
        "manifest_path": BASE_DIR / "frontend_dist" / "manifest.json",
    }
}
INERTIA_LAYOUT = "inertia_layout.html"
if DEBUG and not DJANGO_VITE["default"]["dev_mode"]:
    # Après `npm run build`, pas besoin de redémarrer le serveur.
    MIDDLEWARE.insert(0, "core.middleware.vite_manifest_reload")
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

LOGIN_URL = "accounts:login"
LOGIN_REDIRECT_URL = "dashboard"
LOGOUT_REDIRECT_URL = "home"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
