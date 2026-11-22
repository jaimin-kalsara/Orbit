"""Starter workflow every new account gets. These are real, editable rows —
users can rename, recolor, reorder or delete all of them in Settings."""
from django.db import transaction

from accounts.models import UserPreference
from tasks.models import Category, Priority, Status

DEFAULT_STATUSES = [
    ("To do", "#8A8F98", "todo"),
    ("In progress", "#F5A524", "in_progress"),
    ("Done", "#22C55E", "done"),
]
DEFAULT_PRIORITIES = [
    ("Low", "#64748B", 1),
    ("Medium", "#3B82F6", 2),
    ("High", "#F59E0B", 3),
    ("Urgent", "#EF4444", 4),
]
DEFAULT_CATEGORIES = [
    ("Work", "#3B82F6", "briefcase"),
    ("Personal", "#A3E635", "user"),
    ("Health", "#F43F5E", "heart"),
    ("Learning", "#F59E0B", "book"),
]


@transaction.atomic
def provision_user(user, timezone_name: str = "UTC"):
    UserPreference.objects.get_or_create(user=user, defaults={"timezone": timezone_name})
    if not Status.objects.filter(user=user).exists():
        Status.objects.bulk_create(
            Status(user=user, name=n, color=c, kind=k, position=i)
            for i, (n, c, k) in enumerate(DEFAULT_STATUSES)
        )
    if not Priority.objects.filter(user=user).exists():
        Priority.objects.bulk_create(
            Priority(user=user, name=n, color=c, level=lvl, position=i)
            for i, (n, c, lvl) in enumerate(DEFAULT_PRIORITIES)
        )
    if not Category.objects.filter(user=user).exists():
        Category.objects.bulk_create(
            Category(user=user, name=n, color=c, icon=ic, position=i)
            for i, (n, c, ic) in enumerate(DEFAULT_CATEGORIES)
        )
