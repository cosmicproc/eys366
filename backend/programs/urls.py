from django.urls import path
from .views import delete_program, update_program

urlpatterns = [
    path("api/program/delete_program", delete_program, name="delete-program"),
    path("api/program/update_program", update_program, name="update-program"),
]
