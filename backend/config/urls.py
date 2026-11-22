from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("tasks.urls")),
]

# Serve the built React app (frontend/dist) for every non-API route.
if (settings.FRONTEND_DIST / "index.html").exists():
    urlpatterns += [
        re_path(
            r"^(?!api/|admin/|static/).*$",
            ensure_csrf_cookie(TemplateView.as_view(template_name="index.html")),
        )
    ]
