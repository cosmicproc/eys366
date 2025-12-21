from django.shortcuts import render
from rest_framework import viewsets
from .models import ProgramOutcome, LearningOutcome
from .serializers import ProgramOutcomeSerializer, LearningOutcomeSerializer

class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcome.objects.all()
    serializer_class = ProgramOutcomeSerializer

class LearningOutcomeViewSet(viewsets.ModelViewSet):
    queryset = LearningOutcome.objects.all()
    serializer_class = LearningOutcomeSerializer


