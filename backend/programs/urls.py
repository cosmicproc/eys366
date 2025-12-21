from django.urls import path

from .views import (
    AssignLecturerToCourse,
    CreateCourse,
    delete_program,
    list_courses,
    program_info,
    update_program,
)

urlpatterns = [
    path("program/delete_program", delete_program, name="delete-program"),
    path("program/update_program", update_program, name="update-program"),
    path("program/program-info", program_info, name="program-info"),
    path("programs/list_courses", list_courses, name="list-courses"),
    path("programs/create_course", CreateCourse.as_view(), name="create-course"),
    path(
        "programs/assign_lecturer",
        AssignLecturerToCourse.as_view(),
        name="assign-lecturer",
    ),
]
