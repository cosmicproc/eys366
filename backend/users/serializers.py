from programs.models import Program
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    courseIds = serializers.SerializerMethodField()
    courses = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    def get_courseIds(self, obj):
        # Return list of course IDs (as strings for UUIDs) where user is the lecturer
        if obj.role == "lecturer":
            return [
                str(course_id)
                for course_id in Program.objects.filter(lecturer=obj).values_list(
                    "id", flat=True
                )
            ]
        # Department heads can access all courses
        return [
            str(course_id)
            for course_id in Program.objects.all().values_list("id", flat=True)
        ]

    def get_courses(self, obj):
        # Return list of course IDs as integers for filtering
        if obj.role == "lecturer":
            return list(
                Program.objects.filter(lecturer=obj).values_list("id", flat=True)
            )
        # Department heads can access all courses
        return list(Program.objects.all().values_list("id", flat=True))

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)  # Hash the password properly

        instance.save()
        return instance

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
            "courses",
            "password",
        ]
        read_only_fields = ["id", "date_joined", "courseIds", "courses"]
