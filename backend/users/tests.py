from django.test import TestCase
from .models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.email, "test@example.com")
        self.assertTrue(user.check_password("testpassword"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_superuser(self):
        superuser = User.objects.create_superuser(
            username="superuser",
            email="superuser@example.com",
            password="superpassword"
        )
        self.assertEqual(superuser.username, "superuser")
        self.assertEqual(superuser.email, "superuser@example.com")
        self.assertTrue(superuser.check_password("superpassword"))
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)

class UserViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # create a department head so view actions requiring elevated permissions succeed
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="testpassword", role="department_head")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_login(self):
        self.client.logout()
        data = {"username": "testuser", "password": "testpassword"}
        response = self.client.post("/api/users/login/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout(self):
        response = self.client.post("/api/users/logout/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_current_user(self):
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_lecturer(self):
        data = {
            "username": "newlecturer",
            "email": "lecturer@example.com",
            "name": "New Lecturer",
            "university": "Test University",
            "department": "Test Department",
        }
        response = self.client.post("/api/users/create_lecturer/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_user(self):
        data = {"username": "newuser", "email": "new@example.com", "password": "newpassword"}
        response = self.client.post("/api/users/create/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_user(self):
        response = self.client.get(f"/api/users/{self.user.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_user(self):
        data = {
            "first_name": "Updated",
            "last_name": "User",
            "email": "updated@example.com",
            "university": "Updated University",
            "department": "Updated Department"
        }
        response = self.client.put(f"/api/users/{self.user.id}/update/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_user(self):
        response = self.client.delete(f"/api/users/delete_user/{self.user.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
