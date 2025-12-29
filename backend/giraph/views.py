from django.db import IntegrityError
from django.http import JsonResponse
from programs.models import Program
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LayerChoices, Node, Relation
from .serializers import (
    GetNodesResponseSerializer,
    NewNodeSerializer,
    NewRelationSerializer,
    UpdateNodeSerializer,
    UpdateRelationSerializer,
)


def ping(request):
    """Basic healthcheck endpoint."""
    return JsonResponse({"ok": True, "service": "giraph", "message": "endpoint works"})


class NewNode(APIView):
    """POST /api/giraph/new_node
    Body: {"name": str, "layer": "course_content"|"course_outcome"|"program_outcome", "course_id": str (UUID)}
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        ser = NewNodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        course_id = ser.validated_data["course_id"]
        try:
            course = Program.objects.get(pk=course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        node = Node.objects.create(
            name=ser.validated_data["name"],
            layer=ser.validated_data["layer"],
            course=course,
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

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
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
    """GET /api/giraph/get_nodes/?courseId=<id>
    Returns all nodes and relations in the graph, filtered by course if provided.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        course_id = request.query_params.get("courseId")

        # Filter nodes by course if provided
        if course_id:
            try:
                # Verify course exists
                course = Program.objects.get(pk=course_id)
                nodes = list(
                    Node.objects.filter(course=course).only(
                        "id", "name", "layer", "course_id"
                    )
                )
                # Only get relations between nodes in this course
                node_ids = [n.id for n in nodes]
                rels = list(
                    Relation.objects.filter(
                        node1_id__in=node_ids, node2_id__in=node_ids
                    ).only("id", "node1_id", "node2_id", "weight")
                )
            except Program.DoesNotExist:
                return Response(
                    {"detail": f"Course {course_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            nodes = list(Node.objects.all().only("id", "name", "layer", "course_id"))
            rels = list(
                Relation.objects.all().only("id", "node1_id", "node2_id", "weight")
            )

        rel_map = {n.id: [] for n in nodes}
        for r in rels:
            stub = {
                "node1_id": r.node1_id,
                "node2_id": r.node2_id,
                "relation_id": r.id,
                "weight": r.weight,
            }
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

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
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

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
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

    authentication_classes = []
    permission_classes = [AllowAny]

    def delete(self, request):
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

    authentication_classes = []
    permission_classes = [AllowAny]

    def delete(self, request):
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


class GetProgramOutcomes(APIView):
    """GET /api/giraph/get_program_outcomes
    Returns all program outcomes (global, not course-specific)
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        outcomes = list(
            Node.objects.filter(layer=LayerChoices.PROGRAM_OUTCOME).values("id", "name")
        )
        return Response(
            {"program_outcomes": outcomes},
            status=status.HTTP_200_OK,
        )


class CreateProgramOutcome(APIView):
    """POST /api/giraph/create_program_outcome
    Body: {"name": str}
    Only department heads can create program outcomes
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get("name", "").strip()
        if not name:
            return Response(
                {"detail": "name is required."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if len(name) > 255:
            return Response(
                {"detail": "name must be at most 255 characters."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        outcome = Node.objects.create(
            name=name,
            layer=LayerChoices.PROGRAM_OUTCOME,
            course=None,  # Program outcomes are global
        )
        return Response(
            {"message": "Program outcome created.", "id": outcome.id},
            status=status.HTTP_201_CREATED,
        )


class DeleteProgramOutcome(APIView):
    """DELETE /api/giraph/delete_program_outcome
    Body: {"outcome_id": int}
    Only department heads can delete program outcomes
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def delete(self, request):
        outcome_id = request.data.get("outcome_id")
        if not outcome_id:
            return Response(
                {"detail": "outcome_id is required."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            outcome = Node.objects.get(
                pk=outcome_id, layer=LayerChoices.PROGRAM_OUTCOME
            )
        except Node.DoesNotExist:
            return Response(
                {"detail": f"Program outcome {outcome_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        outcome.delete()
        return Response(
            {"message": "Program outcome deleted."},
            status=status.HTTP_200_OK,
        )
