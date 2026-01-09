from django.test import TestCase
from .models import Program
from users.models import User
from rest_framework.test import APIClient
from rest_framework import status

class ProgramModelTest(TestCase):
    def test_create_program(self):
        lecturer = User.objects.create(username="test_lecturer", email="test@example.com")
        program = Program.objects.create(
            name="Test Program",
            lecturer=lecturer,
            university="Test University",
            department="Test Department"
        )
        self.assertEqual(program.name, "Test Program")
        self.assertEqual(program.lecturer, lecturer)
        self.assertEqual(program.university, "Test University")
        self.assertEqual(program.department, "Test Department")
        self.assertTrue(program.id)
        self.assertEqual(str(program), "Test Program")

class ProgramViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # create a department head so test actions requiring elevated permissions succeed
        self.lecturer = User.objects.create_user(username="test_lecturer", email="test@example.com", password="password", role="department_head")
        from rest_framework.authtoken.models import Token
        token = Token.objects.create(user=self.lecturer)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        self.program = Program.objects.create(
            name="Test Program",
            lecturer=self.lecturer,
            university="Test University",
            department="Test Department"
        )

    def test_program_info(self):
        response = self.client.get("/api/programs/program-info/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_courses(self):
        response = self.client.get("/api/programs/list_courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_course(self):
        data = {
            "name": "New Course",
            "university": "New University",
            "department": "New Department",
            "lecturer_id": str(self.lecturer.id)
        }
        response = self.client.post("/api/programs/create_course/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_assign_lecturer_to_course(self):
        new_lecturer = User.objects.create(username="new_lecturer", email="new@example.com")
        data = {
            "course_id": str(self.program.id),
            "lecturer_id": str(new_lecturer.id)
        }
        response = self.client.post("/api/programs/assign_lecturer/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_program(self):
        response = self.client.delete(f"/api/programs/delete_program/{self.program.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_program(self):
        data = {
            "name": "Updated Program Name"
        }
        response = self.client.put(f"/api/programs/update_program/{self.program.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
