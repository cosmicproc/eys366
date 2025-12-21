from django.db import models
import uuid
from users.models import User

class LearningOutcome(models.Model):

    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True, editable=False)
    name = models.CharField(max_length=200,null=False)
    description = models.CharField(max_length=500)

    def __str__(self):
        return self.name
  


class ProgramOutcome(models.Model):
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True, editable=False)
    name = models.CharField(max_length=200,null=False)
    description = models.CharField(max_length=500)

    def __str__(self):
        return self.name
