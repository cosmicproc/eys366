from django.urls import path

from .views import (
    CreateLecturer,
    create_user,
    delete_user,
    get_current_user,
    get_user,
    login,
    logout,
    update_user,
    request_password_reset,
    reset_password,
)

urlpatterns = [
    path("login/", login, name="login"),
    path("logout/", logout, name="logout"),
    path("me/", get_current_user, name="current-user"),
    path("create/", create_user, name="create-user"),
    path("create_lecturer/", CreateLecturer.as_view(), name="create-lecturer"),
    path("<uuid:pk>/", get_user, name="get-user"),
    path("<uuid:pk>/update/", update_user, name="update-user"),
    path("delete_user/<uuid:pk>/", delete_user, name="delete-user"),
    path("request-password-reset/", request_password_reset, name="request-password-reset"),
    path("reset-password/", reset_password, name="reset-password"),
]
