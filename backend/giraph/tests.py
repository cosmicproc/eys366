import pytest
from rest_framework.test import APIClient

from .models import LayerChoices, Node, Relation


@pytest.mark.django_db
def Test_NewNode():
	client = APIClient()
	payload = {"name": "Test Node", "layer": LayerChoices.COURSE_CONTENT}
	response = client.post("/api/giraph/new_node", payload, format="json")

	assert response.status_code == 201
	data = response.json()
	assert data["message"] == "Node created."

	node_id = data["node_id"]
	node = Node.objects.get(pk=node_id)
	assert node.name == "Test Node"
	assert node.layer == LayerChoices.COURSE_CONTENT


@pytest.mark.django_db
def Test_NewRelation():
	# create nodes for a valid cc -> co relation
	n_cc = Node.objects.create(name="CC 1", layer=LayerChoices.COURSE_CONTENT)
	n_co = Node.objects.create(name="CO 1", layer=LayerChoices.COURSE_OUTCOME)

	client = APIClient()
	payload = {"node1_id": n_cc.id, "node2_id": n_co.id, "weight": 3}
	response = client.post("/api/giraph/new_relation", payload, format="json")

	assert response.status_code == 201
	data = response.json()
	assert data["message"] == "Relation created."

	rel_id = data["relation_id"]
	rel = Relation.objects.get(pk=rel_id)
	assert rel.node1_id == n_cc.id
	assert rel.node2_id == n_co.id
	assert rel.weight == 3


@pytest.mark.django_db
def Test_GetNodes():
	# setup three nodes and two relations: cc->co and co->po
	n_cc = Node.objects.create(name="CC 2", layer=LayerChoices.COURSE_CONTENT)
	n_co = Node.objects.create(name="CO 2", layer=LayerChoices.COURSE_OUTCOME)
	n_po = Node.objects.create(name="PO 1", layer=LayerChoices.PROGRAM_OUTCOME)

	r1 = Relation.objects.create(node1=n_cc, node2=n_co, weight=2)
	r2 = Relation.objects.create(node1=n_co, node2=n_po, weight=5)

	client = APIClient()
	response = client.get("/api/giraph/get_nodes")

	assert response.status_code == 200
	data = response.json()

	# find cc node in course_contents
	cc_list = data.get("course_contents", [])
	assert any(n["id"] == n_cc.id for n in cc_list)
	cc_node = next(n for n in cc_list if n["id"] == n_cc.id)
	# cc node should have one relation (r1)
	assert any(r["relation_id"] == r1.id for r in cc_node["relations"]) 

	# course_outcomes should include co node with both relations (r1 and r2)
	co_list = data.get("course_outcomes", [])
	assert any(n["id"] == n_co.id for n in co_list)
	co_node = next(n for n in co_list if n["id"] == n_co.id)
	rel_ids = {r["relation_id"] for r in co_node["relations"]}
	assert r1.id in rel_ids and r2.id in rel_ids

	# program_outcomes should include po node with r2
	po_list = data.get("program_outcomes", [])
	assert any(n["id"] == n_po.id for n in po_list)
	po_node = next(n for n in po_list if n["id"] == n_po.id)
	assert any(r["relation_id"] == r2.id for r in po_node["relations"])
