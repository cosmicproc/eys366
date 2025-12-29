from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgramOutcomeViewSet, LearningOutcomeViewSet

router = DefaultRouter()
router.register(r'program-outcomes', ProgramOutcomeViewSet, basename='program-outcome')
router.register(r'learning-outcomes', LearningOutcomeViewSet, basename='learning-outcome')

urlpatterns = [
    path('', include(router.urls)),
]