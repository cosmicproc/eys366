from django.test import TestCase
from .models import CourseOutcome, ProgramOutcome
from rest_framework.test import APIClient
from rest_framework import status
import pandas as pd
import io
from django.core.files.uploadedfile import SimpleUploadedFile

class CourseOutcomeModelTest(TestCase):

    def test_create_course_outcome(self):
        outcome = CourseOutcome.objects.create(
            name="Test Course Outcome",
            description="This is a test description."
        )
        self.assertEqual(outcome.name, "Test Course Outcome")
        self.assertEqual(outcome.description, "This is a test description.")
        self.assertTrue(outcome.id)
        self.assertEqual(str(outcome), "Test Course Outcome")

class ProgramOutcomeModelTest(TestCase):

    def test_create_program_outcome(self):
        outcome = ProgramOutcome.objects.create(
            name="Test Program Outcome"
        )
        self.assertEqual(outcome.name, "Test Program Outcome")
        self.assertTrue(outcome.id)
        self.assertEqual(str(outcome), "Test Program Outcome")

class ProgramOutcomeViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.program_outcome = ProgramOutcome.objects.create(name="Initial Outcome")

    def test_list_program_outcomes(self):
        response = self.client.get("/api/outcomes/program-outcomes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_program_outcome(self):
        data = {"name": "New Outcome"}
        response = self.client.post("/api/outcomes/program-outcomes/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrieve_program_outcome(self):
        response = self.client.get(f"/api/outcomes/program-outcomes/{self.program_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_program_outcome(self):
        data = {"name": "Updated Outcome"}
        response = self.client.put(f"/api/outcomes/program-outcomes/{self.program_outcome.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_program_outcome(self):
        response = self.client.delete(f"/api/outcomes/program-outcomes/{self.program_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

class CourseOutcomeViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.course_outcome = CourseOutcome.objects.create(name="Initial Course Outcome", description="Initial Learning Description")

    def test_list_course_outcomes(self):
        response = self.client.get("/api/outcomes/course-outcomes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_course_outcome(self):
        data = {"name": "New Course Outcome", "description": "New Learning Description"}
        response = self.client.post("/api/outcomes/course-outcomes/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrieve_course_outcome(self):
        response = self.client.get(f"/api/outcomes/course-outcomes/{self.course_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_course_outcome(self):
        data = {"name": "Updated Course Outcome", "description": "Updated Learning Description"}
        response = self.client.put(f"/api/outcomes/course-outcomes/{self.course_outcome.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_course_outcome(self):
        response = self.client.delete(f"/api/outcomes/course-outcomes/{self.course_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

class FileUploadTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_upload_file(self):
        # Create a sample DataFrame
        data = {
            'student_id': [1, 2],
            'Midterm': [85, 90],
            'Final': [88, 92],
            'Assignment 1': [78, 85]
        }
        df = pd.DataFrame(data)

        # Create an in-memory Excel file
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)

        # Create a SimpleUploadedFile
        excel_file = SimpleUploadedFile(
            "grades.xlsx",
            excel_buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        # URL of the upload endpoint
        url = '/api/outcomes/upload/'

        # Send the request
        response = self.client.post(url, {'file': excel_file}, format='multipart')

        # Assert the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_json = response.json()
        self.assertIn('individual_results', response_json)
        self.assertIn('average_result', response_json)
