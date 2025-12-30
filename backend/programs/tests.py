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
        self.lecturer = User.objects.create(username="test_lecturer", email="test@example.com", role="lecturer")
        self.program = Program.objects.create(
            name="Test Program",
            lecturer=self.lecturer,
            university="Test University",
            department="Test Department"
        )

    def test_program_info(self):
        response = self.client.get("/api/programs/program/program-info")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_courses(self):
        response = self.client.get("/api/programs/programs/list_courses")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_course(self):
        data = {
            "name": "New Course",
            "university": "New University",
            "department": "New Department",
            "lecturer_id": str(self.lecturer.id)
        }
        response = self.client.post("/api/programs/programs/create_course", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_assign_lecturer_to_course(self):
        new_lecturer = User.objects.create(username="new_lecturer", email="new@example.com")
        data = {
            "course_id": str(self.program.id),
            "lecturer_id": str(new_lecturer.id)
        }
        response = self.client.post("/api/programs/programs/assign_lecturer", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_program(self):
        data = {"program_id": str(self.program.id)}
        response = self.client.delete("/api/programs/program/delete_program", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_program(self):
        data = {
            "program_id": str(self.program.id),
            "name": "Updated Program Name"
        }
        response = self.client.put("/api/programs/program/update_program", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
