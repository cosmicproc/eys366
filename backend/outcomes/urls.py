from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_grades, name='upload_grades'),
    # API-friendly route used by the frontend
    path('upload_grades/', views.upload_grades, name='upload_grades_api'),
    # CRUD for program and course outcomes
    path('program-outcomes/', views.ProgramOutcomeList.as_view(), name='program-outcomes-list'),
    path('program-outcomes/<int:pk>/', views.ProgramOutcomeDetail.as_view(), name='program-outcomes-detail'),
    path('course-outcomes/', views.CourseOutcomeList.as_view(), name='course-outcomes-list'),
    path('course-outcomes/<int:pk>/', views.CourseOutcomeDetail.as_view(), name='course-outcomes-detail'),
]
