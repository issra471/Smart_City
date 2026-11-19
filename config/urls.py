from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("core.urls")),
    path("compte/", include("accounts.urls")),
    path("mobilite/", include("mobilite.urls")),
    path("infrastructures/", include("infrastructures.urls")),
    path("evenements/", include("evenements.urls")),
    path("animaux/", include("animaux.urls")),
    path("marketplace/", include("marketplace.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Pages d'erreur en React (accès refusé, page introuvable)
handler403 = "core.views.error_403"
handler404 = "core.views.error_404"
