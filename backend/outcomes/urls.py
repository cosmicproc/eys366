from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_grades, name='upload_grades'),
    # API-friendly route used by the frontend
    path('upload_grades/', views.upload_grades, name='upload_grades_api'),
]
