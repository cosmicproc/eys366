from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import UserSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Please provide both username and password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if user:
        token, created = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        return Response(
            {"token": token.key, "user": serializer.data}, status=status.HTTP_200_OK
        )

    return Response(
        {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        request.user.auth_token.delete()
        return Response(
            {"message": "Successfully logged out"}, status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class CreateLecturer(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check if user is department head
        if request.user.role not in ["department_head", "head"]:
            return Response(
                {"detail": "Only department heads can create lecturers"},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        name = request.data.get("name", "").strip()
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()

        if not name and first_name:
            name = f"{first_name} {last_name}".strip()

        university = request.data.get("university", "").strip()
        department = request.data.get("department", "").strip()
        password = request.data.get("password", "123")

        if not username or not email or not name:
            return Response(
                {"detail": "username, email, and name are required"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "Email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            name_parts = name.split(" ", 1)
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=name_parts[0],
                last_name=name_parts[1] if len(name_parts) > 1 else "",
                password=password,
                role="lecturer",
                university=university,
                department=department,
            )
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_user(request):
    if request.user.role not in ["department_head", "head", "admin"]:
        return Response(
            {"detail": "Permission denied"},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Allow users to update themselves or heads to update anyone
    if str(request.user.id) != str(pk) and request.user.role not in ["department_head", "head", "admin"]:
        return Response(
            {"detail": "Permission denied"},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = UserSerializer(user)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_user(request, pk):
    if request.user.role not in ["department_head", "head", "admin"]:
        return Response(
            {"detail": "Only department heads can delete users"},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
