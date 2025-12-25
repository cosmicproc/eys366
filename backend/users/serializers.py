from programs.models import Program
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    courseIds = serializers.SerializerMethodField()

    def get_courseIds(self, obj):
        # Return list of course IDs (as strings for UUIDs) where user is the lecturer
        if obj.role == "lecturer":
            return list(
                Program.objects.filter(lecturer=obj).values_list("id", flat=True)
            )
        # Department heads can access all courses
        return list(Program.objects.all().values_list("id", flat=True))

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "department",
            "university",
            "is_active",
            "is_staff",
            "date_joined",
            "courseIds",
        ]
        read_only_fields = ["id", "date_joined", "courseIds"]
