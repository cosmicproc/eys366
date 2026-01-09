from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
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


@api_view(["POST"])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request a password reset email"""
    email = request.data.get("email")
    
    if not email:
        return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        
        # Generate reset token
        reset_token = get_random_string(64)
        user.reset_token = reset_token
        user.reset_token_expiry = timezone.now() + timedelta(hours=1)
        user.save()
        
        # Construct reset URL
        frontend_url = request.headers.get('Origin', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Send email
        try:
            send_mail(
                subject="Password Reset Request - EYS-366",
                message=f"""
Hello {user.first_name or user.username},

You requested a password reset for your EYS-366 account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
EYS-366 Team
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"Password reset email sent to {email}")  # Debug log
        except Exception as email_error:
            print(f"Email sending error: {str(email_error)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to send email: {str(email_error)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({"message": "Password reset email sent"}, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        # Don't reveal if email exists (security best practice)
        return Response(
            {"message": "If email exists, reset link has been sent"}, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"Password reset error: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": f"Server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using token"""
    token = request.data.get("token")
    new_password = request.data.get("password")
    
    if not token or not new_password:
        return Response(
            {"error": "Token and password are required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(reset_token=token)
        
        # Check if token expired
        if user.reset_token_expiry < timezone.now():
            return Response(
                {"error": "Reset token has expired"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset password
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        user.save()
        
        print(f"Password reset successful for user: {user.username}")  # Debug log
        
        return Response(
            {"message": "Password reset successful"}, 
            status=status.HTTP_200_OK
        )
        
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid or expired reset token"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
        
    except Exception as e:
        import traceback
        print(f"Password reset error: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": f"Failed to reset password: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
