from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')
        
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)  # Add this
        return self.create_user(username, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("lecturer","Lecturer"),
        ("department_head","Department Head"),
        ("admin","Admin")
    ]
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True, editable=False)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=200, blank=True)  # Changed to blank=True
    last_name = models.CharField(max_length=200, blank=True)   # Changed to blank=True
    email = models.EmailField(max_length=200, unique=True)
    university = models.CharField(max_length=200, blank=True)  # Changed to blank=True
    password = models.CharField(max_length=128)
    department = models.CharField(max_length=100, blank=True)  # Changed to blank=True
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='lecturer')
    date_joined = models.DateTimeField(default=timezone.now, verbose_name="Kayıt Tarihi")
    is_active = models.BooleanField(default=True)  # Changed to True
    is_staff = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']
    
    def __str__(self):
        return self.username
    
    @property
    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        if full_name and full_name != "":
            return full_name
        else:
            return self.email
