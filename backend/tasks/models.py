from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from accounts.models import hex_color


class OwnedOrderedModel(models.Model):
    """Base for user-owned, user-ordered taxonomy rows (categories, statuses…)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=40)
    color = models.CharField(max_length=7, default="#8A8F98", validators=[hex_color])
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ["position", "id"]

    def __str__(self):
        return self.name


class Category(OwnedOrderedModel):
    icon = models.CharField(max_length=32, default="folder")

    class Meta(OwnedOrderedModel.Meta):
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(Lower("name"), "user", name="uniq_category_name_per_user")
        ]


class Project(OwnedOrderedModel):
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=280, blank=True)
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="projects"
    )
    is_archived = models.BooleanField(default=False)

    class Meta(OwnedOrderedModel.Meta):
        constraints = [
            models.UniqueConstraint(Lower("name"), "user", name="uniq_project_name_per_user")
        ]


class Status(OwnedOrderedModel):
    class Kind(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"

    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.TODO)

    class Meta(OwnedOrderedModel.Meta):
        verbose_name_plural = "statuses"
        constraints = [
            models.UniqueConstraint(Lower("name"), "user", name="uniq_status_name_per_user")
        ]


class Priority(OwnedOrderedModel):
    level = models.PositiveSmallIntegerField(default=1, help_text="Higher = more important")

    class Meta(OwnedOrderedModel.Meta):
        verbose_name_plural = "priorities"
        constraints = [
            models.UniqueConstraint(Lower("name"), "user", name="uniq_priority_name_per_user")
        ]


class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, max_length=5000)
    status = models.ForeignKey(Status, on_delete=models.PROTECT, related_name="tasks")
    priority = models.ForeignKey(
        Priority, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    project = models.ForeignKey(
        Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "-created_at"]
        indexes = [
            models.Index(fields=["user", "due_date"]),
            models.Index(fields=["user", "completed_at"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return self.title

    def sync_completion(self):
        """Keep completed_at consistent with the status kind."""
        done = self.status.kind == Status.Kind.DONE
        if done and self.completed_at is None:
            self.completed_at = timezone.now()
        elif not done:
            self.completed_at = None
