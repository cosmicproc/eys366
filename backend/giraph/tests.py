from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from giraph.models import Node, Relation, LayerChoices
from programs.models import Program
from users.models import User


class NewNodeTests(TestCase):
    def test_new_node(self):
        client = APIClient()
        lecturer = User.objects.create_user(username="testlecturer", email="test@example.com")
        course = Program.objects.create(name="Test Course", lecturer=lecturer)
        payload = {
            "name": "Test Node",
            "layer": LayerChoices.COURSE_CONTENT,
            "course_id": str(course.id),
        }

        response = client.post("/api/giraph/new_node/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["message"], "Node created.")

        node_id = data["node_id"]
        node = Node.objects.get(pk=node_id)

        self.assertEqual(node.name, "Test Node")
        self.assertEqual(node.layer, LayerChoices.COURSE_CONTENT)


class NewRelationTests(TestCase):
    def test_new_relation(self):
        n_cc = Node.objects.create(name="CC 1", layer=LayerChoices.COURSE_CONTENT)
        n_co = Node.objects.create(name="CO 1", layer=LayerChoices.COURSE_OUTCOME)

        client = APIClient()
        payload = {"node1_id": n_cc.id, "node2_id": n_co.id, "weight": 3}

        response = client.post("/api/giraph/new_relation/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["message"], "Relation created.")

        rel_id = data["relation_id"]
        rel = Relation.objects.get(pk=rel_id)

        self.assertEqual(rel.node1_id, n_cc.id)
        self.assertEqual(rel.node2_id, n_co.id)
        self.assertEqual(rel.weight, 3)


class GetNodesTests(TestCase):
    def test_get_nodes(self):
        n_cc = Node.objects.create(name="CC 2", layer=LayerChoices.COURSE_CONTENT)
        n_co = Node.objects.create(name="CO 2", layer=LayerChoices.COURSE_OUTCOME)
        n_po = Node.objects.create(name="PO 1", layer=LayerChoices.PROGRAM_OUTCOME)

        r1 = Relation.objects.create(node1=n_cc, node2=n_co, weight=2)
        r2 = Relation.objects.create(node1=n_co, node2=n_po, weight=5)

        client = APIClient()
        response = client.get("/api/giraph/get_nodes/")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        cc_list = data.get("course_contents", [])
        self.assertTrue(any(n["id"] == n_cc.id for n in cc_list))

        cc_node = next(n for n in cc_list if n["id"] == n_cc.id)
        self.assertTrue(any(r["relation_id"] == r1.id for r in cc_node["relations"]))

        co_list = data.get("course_outcomes", [])
        self.assertTrue(any(n["id"] == n_co.id for n in co_list))

        co_node = next(n for n in co_list if n["id"] == n_co.id)
        rel_ids = {r["relation_id"] for r in co_node["relations"]}
        self.assertIn(r1.id, rel_ids)
        self.assertIn(r2.id, rel_ids)

        po_list = data.get("program_outcomes", [])
        self.assertTrue(any(n["id"] == n_po.id for n in po_list))

        po_node = next(n for n in po_list if n["id"] == n_po.id)
        self.assertTrue(any(r["relation_id"] == r2.id for r in po_node["relations"]))


class UpdateNodeTests(TestCase):
    def test_update_node(self):
        node = Node.objects.create(
            name="Old Name",
            layer=LayerChoices.COURSE_CONTENT,
        )

        client = APIClient()
        payload = {"node_id": node.id, "name": "New Name"}

        response = client.post("/api/giraph/update_node/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Node updated.")

        node.refresh_from_db()
        self.assertEqual(node.name, "New Name")

    def test_update_node_not_found(self):
        client = APIClient()
        payload = {"node_id": 9999, "name": "Anything"}

        response = client.post("/api/giraph/update_node/", payload, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["detail"])


class UpdateRelationTests(TestCase):
    def test_update_relation(self):
        n1 = Node.objects.create(name="A", layer=LayerChoices.COURSE_CONTENT)
        n2 = Node.objects.create(name="B", layer=LayerChoices.COURSE_OUTCOME)
        rel = Relation.objects.create(node1=n1, node2=n2, weight=1)

        client = APIClient()
        payload = {"relation_id": rel.id, "weight": 5}

        response = client.post("/api/giraph/update_relation/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        rel.refresh_from_db()
        self.assertEqual(rel.weight, 5)

    def test_update_relation_not_found(self):
        client = APIClient()
        payload = {"relation_id": 9999, "weight": 5}

        response = client.post("/api/giraph/update_relation/", payload, format="json")
        self.assertEqual(response.status_code, 404)


class DeleteNodeTests(TestCase):
    def test_delete_node(self):
        node = Node.objects.create(name="To Delete", layer=LayerChoices.COURSE_CONTENT)
        client = APIClient()
        payload = {"node_id": node.id}

        response = client.post("/api/giraph/delete_node/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Node.objects.filter(pk=node.id).exists())

    def test_delete_node_missing_id(self):
        client = APIClient()
        payload = {}

        response = client.post("/api/giraph/delete_node/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_delete_node_not_found(self):
        client = APIClient()
        payload = {"node_id": 9999}

        response = client.post("/api/giraph/delete_node/", payload, format="json")
        self.assertEqual(response.status_code, 404)


class DeleteRelationTests(TestCase):
    def test_delete_relation(self):
        n1 = Node.objects.create(name="A", layer=LayerChoices.COURSE_CONTENT)
        n2 = Node.objects.create(name="B", layer=LayerChoices.COURSE_OUTCOME)
        rel = Relation.objects.create(node1=n1, node2=n2, weight=1)

        client = APIClient()
        payload = {"relation_id": rel.id}

        response = client.post("/api/giraph/delete_relation/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Relation.objects.filter(pk=rel.id).exists())

    def test_delete_relation_missing_id(self):
        client = APIClient()
        payload = {}

        response = client.post("/api/giraph/delete_relation/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_delete_relation_not_found(self):
        client = APIClient()
        payload = {"relation_id": 9999}

        response = client.post("/api/giraph/delete_relation/", payload, format="json")
        self.assertEqual(response.status_code, 404)


class ProgramOutcomeTests(TestCase):
    def test_get_program_outcomes(self):
        client = APIClient()
        response = client.get("/api/giraph/get_program_outcomes/")
        self.assertEqual(response.status_code, 200)

    def test_create_program_outcome(self):
        client = APIClient()
        payload = {"name": "New PO", "description": "Test description"}

        response = client.post("/api/giraph/create_program_outcome/", payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_delete_program_outcome(self):
        node = Node.objects.create(name="PO to delete", layer=LayerChoices.PROGRAM_OUTCOME)
        client = APIClient()
        payload = {"outcome_id": node.id}

        response = client.delete("/api/giraph/delete_program_outcome/", payload, format="json")
        self.assertEqual(response.status_code, 200)


class PingTest(TestCase):
    def test_ping(self):
        client = APIClient()
        response = client.get("/api/giraph/ping/")
        self.assertEqual(response.status_code, 200)


class SimplifiedGiraphTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="instructor", email="instructor@example.com", password="password")
        self.client.force_authenticate(user=self.user)
        self.course = Program.objects.create(name="CS 101", lecturer=self.user)

    def test_calculate_student_results_simple(self):
        """
        Just tests that the endpoint is reachable and returns 200.
        It runs the REAL compute_student_results logic.
        """
        url = "/api/giraph/calculate_student_results/"
        
        # We assume the service handles empty data gracefully
        response = self.client.get(url, {
            "student_id": "12345", 
            "courseId": str(self.course.id)
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # We can just check that the structure is correct, even if empty
        data = response.json()
        self.assertIn("course_contents", data)

    def test_generate_student_report_csv(self):
        """
        Tests the file upload without mocking. 
        Creates a real in-memory file object using Django's helper.
        """
        # 1. Create dummy CSV content as bytes
        csv_content = b"student_id,Midterm,Final\n1001,80,90\n1002,70,85"
        
        # 2. Wrap it in a Django file object
        file_obj = SimpleUploadedFile("grades.csv", csv_content, content_type="text/csv")

        url = "/api/giraph/generate_student_report/"
        payload = {
            "file": file_obj,
            "courseId": str(self.course.id)
        }

        # 3. Post as multipart/form-data
        response = self.client.post(url, payload, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.json(), list))