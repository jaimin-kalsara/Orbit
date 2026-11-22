from django.urls import include, path
from rest_framework.routers import DefaultRouter

from tasks import views

router = DefaultRouter(trailing_slash=True)
router.register("tasks", views.TaskViewSet, basename="task")
router.register("categories", views.CategoryViewSet, basename="category")
router.register("projects", views.ProjectViewSet, basename="project")
router.register("statuses", views.StatusViewSet, basename="status")
router.register("priorities", views.PriorityViewSet, basename="priority")

urlpatterns = [
    path("bootstrap/", views.BootstrapView.as_view()),
    path("stats/", views.StatsView.as_view()),
    path("", include(router.urls)),
]
