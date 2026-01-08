from rest_framework import serializers
from users.serializers import UserSerializer

from .models import Program


class ProgramSerializer(serializers.ModelSerializer):
    lecturer_name = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = "__all__"

    def get_lecturer_name(self, obj):
        if obj.lecturer:
            first = obj.lecturer.first_name
            last = obj.lecturer.last_name
            if first and last:
                return f"{first} {last}"
            return obj.lecturer.username
        return None
