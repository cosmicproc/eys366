from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import ProgramOutcomeViewSet,LearningOutcomeViewSet

router = DefaultRouter()
router.register(r"outcomes",ProgramOutcomeViewSet,LearningOutcomeViewSet)

urlpatterns = [

    path("",include(router.urls))
    
]