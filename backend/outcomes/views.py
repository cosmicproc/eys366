from django.shortcuts import render
from rest_framework import viewsets
from .models import ProgramOutcome, LearningOutcome
from .serializers import ProgramOutcomeSerializer, LearningOutcomeSerializer
from giraph.models import Node  # Import your Node model

class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcome.objects.all()
    serializer_class = ProgramOutcomeSerializer
    
    def perform_create(self, serializer):
        instance = serializer.save()
        # Also create the graph node
        Node.objects.create(
            name=instance.name,
            layer='program_outcome',
            # Add any other required fields
        )
    
    def perform_destroy(self, instance):
        # Delete the corresponding graph node first
        Node.objects.filter(name=instance.name, layer='program_outcome').delete()
        instance.delete()

class LearningOutcomeViewSet(viewsets.ModelViewSet):
    queryset = LearningOutcome.objects.all()
    serializer_class = LearningOutcomeSerializer


