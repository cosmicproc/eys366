from django.db import models
from users.models import User

class LearningOutcome(models.Model):
    # Remove id field - Django will auto-create integer primary key
    name = models.CharField(max_length=200, null=False)
    description = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return self.name
  

class ProgramOutcome(models.Model):
    # Remove id field - Django will auto-create integer primary key
    name = models.CharField(max_length=200, null=False)
    description = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return self.name
