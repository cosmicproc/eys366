from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

from .serializers import (
    NewNodeSerializer,
    NewRelationSerializer,
    GetNodesResponseSerializer,
    UpdateNodeSerializer,
    UpdateRelationSerializer,
)
from .models import Node, Relation, LayerChoices


def _authorized(request) -> bool:
    """Simple Bearer token authentication."""
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth.lower().startswith("bearer "):
        return False
    token = auth.split(" ", 1)[1].strip()
    return token == "secret-token"


def ping(request):
    """Basic healthcheck endpoint."""
    return JsonResponse({"ok": True, "service": "giraph", "message": "endpoint works"})


class NewNode(APIView):
    """POST /api/giraph/new_node
    Body: {"name": str, "layer": "course_content"|"course_outcome"|"program_outcome"}
    """

    def post(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        ser = NewNodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        node = Node.objects.create(
            name=ser.validated_data["name"],
            layer=ser.validated_data["layer"],
        )
        return Response(
            {"message": "Node created.", "node_id": node.id},
            status=status.HTTP_201_CREATED,
        )


class NewRelation(APIView):
    """POST /api/giraph/new_relation
    Body: {"node1_id": int, "node2_id": int, "weight": 1|2|3|4|5}
    Validation: only cc→co or co→cp connections are allowed.
    """

    def post(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        ser = NewRelationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            rel = Relation.objects.create(
                node1_id=ser.validated_data["node1_id"],
                node2_id=ser.validated_data["node2_id"],
                weight=int(ser.validated_data["weight"]),
            )
        except IntegrityError:
            return Response(
                {"detail": "This relation already exists (node1 -> node2)."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Relation created.", "relation_id": rel.id},
            status=status.HTTP_201_CREATED,
        )


class GetNodes(APIView):
    """GET /api/giraph/get_nodes
    Returns all nodes and relations in the graph.
    """

    def get(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        nodes = list(Node.objects.all().only("id", "name", "layer"))
        rels = list(Relation.objects.all().only("id", "node1_id", "node2_id"))

        rel_map = {n.id: [] for n in nodes}
        for r in rels:
            stub = {"node1_id": r.node1_id, "node2_id": r.node2_id, "relation_id": r.id}
            if r.node1_id in rel_map:
                rel_map[r.node1_id].append(stub)
            if r.node2_id in rel_map:
                rel_map[r.node2_id].append(stub)

        cc, co, po = [], [], []
        for n in nodes:
            pack = {"id": n.id, "name": n.name, "relations": rel_map.get(n.id, [])}
            if n.layer == LayerChoices.COURSE_CONTENT:
                cc.append(pack)
            elif n.layer == LayerChoices.COURSE_OUTCOME:
                co.append(pack)
            else:
                po.append(pack)

        data = {
            "course_contents": cc,
            "course_outcomes": co,
            "program_outcomes": po,
        }
        ser = GetNodesResponseSerializer(data=data)
        ser.is_valid(raise_exception=True)
        return Response(ser.data, status=status.HTTP_200_OK)


class UpdateNode(APIView):
    """POST /api/giraph/update_node
    Body: {"node_id": int, "name": str}
    """

    def post(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        ser = UpdateNodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        node_id = ser.validated_data["node_id"]
        name = ser.validated_data["name"]

        try:
            node = Node.objects.get(pk=node_id)
        except Node.DoesNotExist:
            return Response(
                {"detail": f"Node {node_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        node.name = name
        node.save(update_fields=["name"])
        return Response({"message": "Node updated."}, status=status.HTTP_200_OK)


class UpdateRelation(APIView):
    """POST /api/giraph/update_relation
    Body: {"relation_id": int, "weight": 1|2|3|4|5}
    """

    def post(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        ser = UpdateRelationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        relation_id = ser.validated_data["relation_id"]
        weight = int(ser.validated_data["weight"])

        try:
            rel = Relation.objects.get(pk=relation_id)
        except Relation.DoesNotExist:
            return Response(
                {"detail": f"Relation {relation_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        rel.weight = weight
        rel.save(update_fields=["weight"])
        return Response({"message": "Relation updated."}, status=status.HTTP_200_OK)


class DeleteNode(APIView):
    """DELETE /api/giraph/delete_node
    Body: {"node_id": int}
    """

    def delete(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        node_id = request.data.get("node_id")
        if not node_id:
            return Response(
                {"detail": "node_id is required."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            node = Node.objects.get(pk=node_id)
        except Node.DoesNotExist:
            return Response(
                {"detail": f"Node {node_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        node.delete()
        return Response({"message": "Node deleted."}, status=status.HTTP_200_OK)


class DeleteRelation(APIView):
    """DELETE /api/giraph/delete_relation
    Body: {"relation_id": int}
    """

    def delete(self, request):
        if not _authorized(request):
            return Response(
                {"detail": "Auth required. Use Authorization: Bearer secret-token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        relation_id = request.data.get("relation_id")
        if not relation_id:
            return Response(
                {"detail": "relation_id is required."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            rel = Relation.objects.get(pk=relation_id)
        except Relation.DoesNotExist:
            return Response(
                {"detail": f"Relation {relation_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        rel.delete()
        return Response({"message": "Relation deleted."}, status=status.HTTP_200_OK)
