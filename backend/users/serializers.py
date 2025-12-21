from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'department', 'university', 'is_active', 'is_staff', 'date_joined']
        read_only_fields = ['id', 'date_joined']