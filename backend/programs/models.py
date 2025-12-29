from django.db import models
import uuid
from users.models import User

class Program(models.Model):

    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True, editable=False)
    name = models.CharField(max_length=200,null=False)
    lecturer = models.ForeignKey(User,on_delete=models.CASCADE)
    university = models.CharField(max_length=200) 
    department = models.CharField(max_length=100) 

    def __str__(self):
        return self.name
