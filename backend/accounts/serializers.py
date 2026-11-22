from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

from accounts.models import WIDGET_IDS, UserPreference

User = get_user_model()


def validate_tz(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise serializers.ValidationError("Unknown time zone.")
    return value


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", max_length=150, allow_blank=False)

    class Meta:
        model = User
        fields = ["id", "email", "name", "date_joined"]
        read_only_fields = ["id", "email", "date_joined"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})
    timezone = serializers.CharField(required=False, default="UTC", max_length=64)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_timezone(self, value):
        try:
            return validate_tz(value)
        except serializers.ValidationError:
            return "UTC"

    def validate(self, attrs):
        candidate = User(username=attrs["email"], email=attrs["email"], first_name=attrs["name"])
        password_validation.validate_password(attrs["password"], candidate)
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["name"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, max_length=128)
    new_password = serializers.CharField(write_only=True, max_length=128)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        exclude = ["id", "user"]
        read_only_fields = ["updated_at"]

    def validate_timezone(self, value):
        return validate_tz(value)

    def validate_accent_color(self, value):
        return value.upper()

    def validate_dashboard_widgets(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Expected a list of widgets.")
        seen, cleaned = set(), []
        for item in value:
            if not isinstance(item, dict) or item.get("id") not in WIDGET_IDS:
                raise serializers.ValidationError("Unknown widget.")
            if item["id"] in seen:
                continue
            seen.add(item["id"])
            cleaned.append({"id": item["id"], "visible": bool(item.get("visible", True))})
        # Never lose a widget: append any missing ones as hidden.
        cleaned += [{"id": wid, "visible": False} for wid in WIDGET_IDS if wid not in seen]
        return cleaned
