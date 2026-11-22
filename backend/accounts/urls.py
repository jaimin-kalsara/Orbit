from django.urls import path

from accounts import views

urlpatterns = [
    path("csrf/", views.CsrfView.as_view()),
    path("register/", views.RegisterView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("logout/", views.LogoutView.as_view()),
    path("me/", views.MeView.as_view()),
    path("password/", views.PasswordChangeView.as_view()),
    path("preferences/", views.PreferenceView.as_view()),
]
