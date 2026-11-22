from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models

hex_color = RegexValidator(r"^#[0-9a-fA-F]{6}$", "Use a hex color like #3B82F6.")

DEFAULT_WIDGETS = [
    {"id": "today", "visible": True},
    {"id": "summary", "visible": True},
    {"id": "focus", "visible": True},
    {"id": "weekly", "visible": True},
    {"id": "overdue", "visible": True},
    {"id": "upcoming", "visible": True},
    {"id": "categories", "visible": True},
    {"id": "priorities", "visible": False},
]
WIDGET_IDS = [w["id"] for w in DEFAULT_WIDGETS]


def default_widgets():
    return [dict(w) for w in DEFAULT_WIDGETS]


class UserPreference(models.Model):
    class Theme(models.TextChoices):
        DARK = "dark", "Dark"
        LIGHT = "light", "Light"
        SYSTEM = "system", "System"

    class View(models.TextChoices):
        LIST = "list", "List"
        GRID = "grid", "Grid"
        KANBAN = "kanban", "Kanban"

    class Density(models.TextChoices):
        COMFORTABLE = "comfortable", "Comfortable"
        COMPACT = "compact", "Compact"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="preference"
    )
    theme = models.CharField(max_length=10, choices=Theme.choices, default=Theme.DARK)
    accent_color = models.CharField(max_length=7, default="#C8F542", validators=[hex_color])
    density = models.CharField(max_length=12, choices=Density.choices, default=Density.COMFORTABLE)
    reduce_motion = models.BooleanField(default=False)
    default_view = models.CharField(max_length=10, choices=View.choices, default=View.LIST)
    show_completed = models.BooleanField(default=True)
    week_start = models.PositiveSmallIntegerField(
        default=1, validators=[MaxValueValidator(6)], help_text="0 = Sunday … 6 = Saturday"
    )
    daily_goal = models.PositiveSmallIntegerField(
        default=5, validators=[MinValueValidator(1), MaxValueValidator(50)]
    )
    dashboard_widgets = models.JSONField(default=default_widgets)
    reminders_enabled = models.BooleanField(default=True)
    browser_notifications = models.BooleanField(default=False)
    reminder_sound = models.BooleanField(default=False)
    default_reminder_minutes = models.PositiveIntegerField(
        default=30, validators=[MaxValueValidator(60 * 24 * 7)]
    )
    overdue_alerts = models.BooleanField(default=True)
    timezone = models.CharField(max_length=64, default="UTC")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user}"
