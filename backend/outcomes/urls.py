from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgramOutcomeViewSet, LearningOutcomeViewSet

router = DefaultRouter()
router.register(r"program-outcomes", ProgramOutcomeViewSet, basename="programoutcome")
router.register(r"learning-outcomes", LearningOutcomeViewSet, basename="learningoutcome")

urlpatterns = [
    path("", include(router.urls)),
]