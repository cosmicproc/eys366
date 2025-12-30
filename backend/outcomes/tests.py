from django.test import TestCase
from .models import LearningOutcome, ProgramOutcome
from rest_framework.test import APIClient
from rest_framework import status

class LearningOutcomeModelTest(TestCase):

    def test_create_learning_outcome(self):
        outcome = LearningOutcome.objects.create(
            name="Test Learning Outcome",
            description="This is a test description."
        )
        self.assertEqual(outcome.name, "Test Learning Outcome")
        self.assertEqual(outcome.description, "This is a test description.")
        self.assertTrue(outcome.id)
        self.assertEqual(str(outcome), "Test Learning Outcome")

class ProgramOutcomeModelTest(TestCase):

    def test_create_program_outcome(self):
        outcome = ProgramOutcome.objects.create(
            name="Test Program Outcome",
            description="This is a test description for the program outcome."
        )
        self.assertEqual(outcome.name, "Test Program Outcome")
        self.assertEqual(outcome.description, "This is a test description for the program outcome.")
        self.assertTrue(outcome.id)
        self.assertEqual(str(outcome), "Test Program Outcome")

class ProgramOutcomeViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.program_outcome = ProgramOutcome.objects.create(name="Initial Outcome", description="Initial Description")

    def test_list_program_outcomes(self):
        response = self.client.get("/api/outcomes/program-outcomes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_program_outcome(self):
        data = {"name": "New Outcome", "description": "New Description"}
        response = self.client.post("/api/outcomes/program-outcomes/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrieve_program_outcome(self):
        response = self.client.get(f"/api/outcomes/program-outcomes/{self.program_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_program_outcome(self):
        data = {"name": "Updated Outcome", "description": "Updated Description"}
        response = self.client.put(f"/api/outcomes/program-outcomes/{self.program_outcome.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_program_outcome(self):
        response = self.client.delete(f"/api/outcomes/program-outcomes/{self.program_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

class LearningOutcomeViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.learning_outcome = LearningOutcome.objects.create(name="Initial Learning Outcome", description="Initial Learning Description")

    def test_list_learning_outcomes(self):
        response = self.client.get("/api/outcomes/learning-outcomes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_learning_outcome(self):
        data = {"name": "New Learning Outcome", "description": "New Learning Description"}
        response = self.client.post("/api/outcomes/learning-outcomes/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrieve_learning_outcome(self):
        response = self.client.get(f"/api/outcomes/learning-outcomes/{self.learning_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_learning_outcome(self):
        data = {"name": "Updated Learning Outcome", "description": "Updated Learning Description"}
        response = self.client.put(f"/api/outcomes/learning-outcomes/{self.learning_outcome.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_learning_outcome(self):
        response = self.client.delete(f"/api/outcomes/learning-outcomes/{self.learning_outcome.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
