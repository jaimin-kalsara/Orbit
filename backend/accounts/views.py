from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.defaults import provision_user
from accounts.models import UserPreference
from accounts.serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PreferenceSerializer,
    RegisterSerializer,
    UserSerializer,
)


class AuthThrottleMixin:
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Sets the CSRF cookie so the SPA can make unsafe requests."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"authenticated": request.user.is_authenticated})


class RegisterView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        provision_user(user, serializer.validated_data.get("timezone", "UTC"))
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"].strip().lower(),
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "That email and password don't match."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        provision_user(user)  # self-heal accounts created outside the app (e.g. admin)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response({"password": ["Password is incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        logout(request)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(AuthThrottleMixin, APIView):
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PreferenceView(APIView):
    def get_object(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user)
        return pref

    def get(self, request):
        return Response(PreferenceSerializer(self.get_object(request)).data)

    def patch(self, request):
        serializer = PreferenceSerializer(self.get_object(request), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
