from django.contrib import admin

from tasks.models import Category, Priority, Project, Status, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "status", "priority", "due_date", "completed_at"]
    list_filter = ["status__kind"]
    search_fields = ["title", "user__email"]
    list_select_related = ["user", "status", "priority"]


for model in (Category, Project, Status, Priority):
    admin.site.register(model)
