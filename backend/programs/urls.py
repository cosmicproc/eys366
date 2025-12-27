from django.urls import path

from .views import (
    AssignLecturerToCourse,
    CreateCourse,
    delete_program,
    list_courses,
    program_info,
    program_settings,
    update_program,
)

urlpatterns = [
    path("programs/delete_program/<uuid:pk>", delete_program, name="delete-program"),
    path("programs/update_program/<uuid:pk>", update_program, name="update-program"),
    path("program/program-info", program_info, name="program-info"),
    path("program/settings", program_settings, name="program-settings"),
    path("programs/list_courses", list_courses, name="list-courses"),
    path("programs/create_course", CreateCourse.as_view(), name="create-course"),
    path(
        "programs/assign_lecturer",
        AssignLecturerToCourse.as_view(),
        name="assign-lecturer",
    ),
]
