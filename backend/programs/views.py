from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from users.models import User
from users.serializers import UserSerializer

from .models import Program
from .serializers import ProgramSerializer


@api_view(["GET"])
def program_info(request):
    """
    GET /api/program/program-info
    Returns all lecturers in the system
    """
    lecturers = User.objects.filter(role="lecturer")
    serializer = UserSerializer(lecturers, many=True)
    return Response({"lecturers": serializer.data}, status=status.HTTP_200_OK)


@api_view(["GET"])
def list_courses(request):
    """
    GET /api/programs/list_courses
    Returns all courses/programs
    """
    courses = Program.objects.all()
    serializer = ProgramSerializer(courses, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


class CreateCourse(APIView):
    """
    POST /api/programs/create_course
    Body: {
      "name": "...",
      "university": "...",
      "department": "...",
      "lecturer_id": "<uuid>"
    }
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()

        # Convert lecturer_id to lecturer if provided
        if "lecturer_id" in data and "lecturer" not in data:
            data["lecturer"] = data.pop("lecturer_id")

        serializer = ProgramSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssignLecturerToCourse(APIView):
    """
    POST /api/programs/assign_lecturer
    Body: {
      "course_id": "<uuid>",
      "lecturer_id": "<uuid>"
    }
    Assigns a lecturer to a course
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        course_id = request.data.get("course_id")
        lecturer_id = request.data.get("lecturer_id")

        if not course_id or not lecturer_id:
            return Response(
                {"detail": "course_id and lecturer_id are required"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            course = Program.objects.get(pk=course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            lecturer = User.objects.get(pk=lecturer_id)
        except User.DoesNotExist:
            return Response(
                {"detail": f"Lecturer {lecturer_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update the course's lecturer
        course.lecturer = lecturer
        course.save()

        serializer = ProgramSerializer(course)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_program(request):
    """
    DELETE /api/program/delete_program
    Body: {"program_id": "<uuid>"}
    """
    program_id = request.data.get("program_id")
    if not program_id:
        return Response(
            {"detail": "program_id is required."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    try:
        program = Program.objects.get(pk=program_id)
    except Program.DoesNotExist:
        return Response(
            {"detail": f"Program {program_id} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    program.delete()
    return Response(
        {"message": "Program deleted."},
        status=status.HTTP_200_OK,
    )


@api_view(["PUT"])
def update_program(request):
    """
    PUT /api/program/update_program
    Body:
    {
      "program_id": "<uuid>",
      "name": "...",
      "university": "...",
      "department": "...",
      "lecturer": <user_id>
    }
    """
    program_id = request.data.get("program_id")

    if not program_id:
        return Response(
            {"detail": "program_id is required."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    try:
        program = Program.objects.get(pk=program_id)
    except Program.DoesNotExist:
        return Response(
            {"detail": f"Program {program_id} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ProgramSerializer(program, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
