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
    path("delete_program/<uuid:pk>/", delete_program, name="delete-program"),
    path("update_program/<uuid:pk>/", update_program, name="update-program"),
    path("program-info/", program_info, name="program-info"),
    path("settings/", program_settings, name="program-settings"),
    path("list_courses/", list_courses, name="list-courses"),
    path("create_course/", CreateCourse.as_view(), name="create-course"),
    path("assign_lecturer/", AssignLecturerToCourse.as_view(), name="assign-lecturer"),
]
