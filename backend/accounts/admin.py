from django.contrib import admin

from accounts.models import UserPreference


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user", "theme", "default_view", "daily_goal", "updated_at"]
    search_fields = ["user__email"]
