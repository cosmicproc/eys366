from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.models import User
from users.serializers import UserSerializer

from .models import Program
from .serializers import ProgramSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def program_info(request):
    """
    GET /api/programs/program-info/
    Returns all lecturers in the system
    """
    lecturers = User.objects.filter(role="lecturer")
    serializer = UserSerializer(lecturers, many=True)
    return Response({"lecturers": serializer.data}, status=status.HTTP_200_OK)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def program_settings(request):
    """
    GET/PUT /api/programs/settings/
    Get or update program settings (university, department info)
    """
    # Get the first department head user for program info
    head = User.objects.filter(role__in=["head", "department_head"]).first()
    
    if not head:
        # Create default settings if no head exists
        if request.method == "GET":
            return Response({
                "university": "",
                "department": "",
            }, status=status.HTTP_200_OK)
    
    if request.method == "GET":
        return Response({
            "university": head.university if head else "",
            "department": head.department if head else "",
        }, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        # Only department heads can update settings
        if request.user.role not in ["head", "department_head"]:
            return Response(
                {"detail": "Only department heads can update settings"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        university = request.data.get("university", "")
        department = request.data.get("department", "")
        
        # Update the head's info
        if head:
            head.university = university
            head.department = department
            head.save()
        
        # Optionally update all users in the same program
        User.objects.all().update(
            university=university,
            department=department
        )
        
        return Response({
            "university": university,
            "department": department,
        }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_courses(request):
    """
    GET /api/programs/list_courses/
    Returns courses based on user role:
    - Lecturers see only their courses
    - Heads see all courses
    """
    if request.user.role in ["head", "department_head"]:
        courses = Program.objects.all()
    else:
        courses = Program.objects.filter(lecturer=request.user)
    
    serializer = ProgramSerializer(courses, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


class CreateCourse(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ["head", "department_head"]:
            return Response(
                {"detail": "Only department heads can create courses"},
                status=status.HTTP_403_FORBIDDEN,
            )

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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ["head", "department_head"]:
            return Response(
                {"detail": "Only department heads can assign lecturers"},
                status=status.HTTP_403_FORBIDDEN,
            )

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

        course.lecturer = lecturer
        course.save()

        serializer = ProgramSerializer(course)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_program(request, pk):
    if request.user.role not in ["head", "department_head"]:
        return Response(
            {"detail": "Only department heads can delete programs"},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    try:
        program = Program.objects.get(pk=pk)
    except Program.DoesNotExist:
        return Response(
            {"detail": f"Program {pk} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    program.delete()
    return Response(
        {"message": "Program deleted."},
        status=status.HTTP_200_OK,
    )


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_program(request, pk):
    if request.user.role not in ["head", "department_head"]:
        return Response(
            {"detail": "Only department heads can update programs"},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    try:
        program = Program.objects.get(pk=pk)
    except Program.DoesNotExist:
        return Response(
            {"detail": f"Program {pk} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ProgramSerializer(program, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
