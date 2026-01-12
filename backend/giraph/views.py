import pandas as pd
from django.db import IntegrityError
from django.http import JsonResponse
from programs.models import Program
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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
from .services import get_full_graph


def ping(request):
    """Basic healthcheck endpoint."""
    return JsonResponse({"ok": True, "service": "giraph", "message": "endpoint works"})


class NewNode(APIView):
    """POST /api/giraph/new_node
    Body: {"name": str, "layer": "course_content"|"course_outcome"|"program_outcome", "course_id": str (UUID)}
    """

    permission_classes = [IsAuthenticated]

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

        name = ser.validated_data["name"]
        layer = ser.validated_data["layer"]

        if Node.objects.filter(name=name, layer=layer, course=course).exists():
            return Response(
                {"detail": f"A node with name '{name}' already exists in this layer."},
                status=status.HTTP_409_CONFLICT,
            )

        node = Node.objects.create(
            name=name,
            layer=layer,
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

    permission_classes = [IsAuthenticated]

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
    Program outcomes are always included regardless of course filter.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("courseId")

        try:
            data = get_full_graph(course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        ser = GetNodesResponseSerializer(data=data)
        ser.is_valid(raise_exception=True)
        return Response(ser.data, status=status.HTTP_200_OK)


class UpdateNode(APIView):
    """POST /api/giraph/update_node
    Body: {"node_id": int, "name": str}
    """

    permission_classes = [IsAuthenticated]

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

        if Node.objects.filter(name=name, layer=node.layer, course=node.course).exclude(id=node.id).exists():
            return Response(
                {"detail": f"A node with name '{name}' already exists in this layer."},
                status=status.HTTP_409_CONFLICT,
            )

        node.name = name
        node.save(update_fields=["name"])
        return Response({"message": "Node updated."}, status=status.HTTP_200_OK)


class UpdateRelation(APIView):
    """POST /api/giraph/update_relation
    Body: {"relation_id": int, "weight": 1|2|3|4|5}
    """

    permission_classes = [IsAuthenticated]

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

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        node_id = request.data.get("node_id")
        if not node_id:
            return Response(
                {"detail": "node_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
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

    def post(self, request):
        return self.delete(request)


class DeleteRelation(APIView):
    """DELETE /api/giraph/delete_relation
    Body: {"relation_id": int}
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        relation_id = request.data.get("relation_id")
        if not relation_id:
            return Response(
                {"detail": "relation_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
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

    def post(self, request):
        return self.delete(request)


class GetProgramOutcomes(APIView):
    """GET /api/giraph/get_program_outcomes
    Returns all program outcomes (global, not course-specific)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        outcomes = list(
            Node.objects.filter(layer=LayerChoices.PROGRAM_OUTCOME).values(
                "id", "name", "score"
            )
        )
        return Response(
            {"program_outcomes": outcomes},
            status=status.HTTP_200_OK,
        )


class ApplyScores(APIView):
    """POST /api/giraph/apply_scores/

    Body: { "values": { "header": number, ... }, "course_id": <uuid?> }
    Maps headers to course_content nodes, sets Node.score and returns updated GetNodes response.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = request.data
        values = payload.get("values", {})
        course_id = payload.get("course_id")

        if not isinstance(values, dict) or not values:
            return Response(
                {"detail": "values must be a non-empty object"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Map headers to nodes
        mapping = {}
        for col, val in values.items():
            normalized = str(col).rsplit("_", 1)[0].strip()
            node = None
            # Use filter().first() to handle potential duplicates gracefully
            node = Node.objects.filter(
                name__iexact=col, layer=LayerChoices.COURSE_CONTENT
            ).first()
            
            if not node:
                node = Node.objects.filter(
                    name__iexact=normalized, layer=LayerChoices.COURSE_CONTENT
                ).first()
            
            if not node:
                node = Node.objects.filter(
                    name__icontains=normalized, layer=LayerChoices.COURSE_CONTENT
                ).first()

            # If node not found but a course_id is provided, try to create the node (and CourseContent if missing)
            if not node and course_id:
                try:
                    from outcomes.models import CourseContent

                    cc = CourseContent.objects.filter(name__iexact=normalized).first()
                    if not cc:
                        cc = CourseContent.objects.create(name=normalized)
                    # Ensure the Node is created for this course
                    try:
                        course = Program.objects.get(pk=course_id)
                        node = Node.objects.create(
                            name=cc.name,
                            layer=LayerChoices.COURSE_CONTENT,
                            course=course,
                        )
                    except Program.DoesNotExist:
                        node = None
                except Exception:
                    node = None

            if node:
                try:
                    node.score = float(val)
                    node.save(update_fields=["score"])
                    # Also persist score on CourseContent if exists
                    try:
                        from outcomes.models import CourseContent

                        cc = CourseContent.objects.filter(
                            name__iexact=node.name
                        ).first()
                        if cc:
                            cc.score = float(val)
                            cc.save(update_fields=["score"])
                    except Exception:
                        pass

                    mapping[node.name] = float(val)
                except Exception:
                    continue

        # Re-use GetNodes to return the latest nodes (filter by course_id if provided)
        try:
            data = get_full_graph(course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        ser = GetNodesResponseSerializer(data=data)
        ser.is_valid(raise_exception=True)
        return Response(ser.data, status=status.HTTP_200_OK)


class ResetScores(APIView):
    """POST /api/giraph/reset_scores/
    Body: { "course_id": <uuid?> }
    Resets scores for all nodes (and potentially CourseContent) for the given course.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get("course_id")

        # Reset all course content nodes (optionally filtered by course)
        nodes_qs = Node.objects.filter(layer=LayerChoices.COURSE_CONTENT)
        if course_id:
            nodes_qs = nodes_qs.filter(course_id=course_id)

        # Get names before update to sync with CourseContent
        node_names = list(nodes_qs.values_list("name", flat=True))

        # Reset Node scores
        nodes_qs.update(score=None)

        # Also reset CourseContent scores
        from outcomes.models import CourseContent
        if node_names:
            CourseContent.objects.filter(name__in=node_names).update(score=None)
        else:
            # If no course_id filter, reset all CourseContent scores
            if not course_id:
                CourseContent.objects.all().update(score=None)

        try:
            data = get_full_graph(course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        ser = GetNodesResponseSerializer(data=data)
        ser.is_valid(raise_exception=True)
        return Response(ser.data, status=status.HTTP_200_OK)



class CreateProgramOutcome(APIView):
    """POST /api/giraph/create_program_outcome
    Body: {"name": str}
    Only department heads can create program outcomes
    """

    permission_classes = [IsAuthenticated]

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


class UpdateProgramOutcome(APIView):
    """PUT /api/giraph/update_program_outcome
    Body: {"id": int, "name": str}
    """

    permission_classes = [IsAuthenticated]

    def put(self, request):
        outcome_id = request.data.get("id")
        name = request.data.get("name", "").strip()

        if not outcome_id:
             return Response(
                {"detail": "id is required."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            outcome = Node.objects.get(pk=outcome_id, layer=LayerChoices.PROGRAM_OUTCOME)
        except Node.DoesNotExist:
             return Response(
                {"detail": f"Outcome {outcome_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if name:
            outcome.name = name
        
        outcome.save()

        return Response(
            {"message": "Program outcome updated."},
            status=status.HTTP_200_OK,
        )


class CalculateStudentResults(APIView):
    """GET /api/giraph/calculate_student_results/?student_id=XXX&courseId=..."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        course_id = request.query_params.get("courseId")

        if not student_id:
            return Response(
                {"detail": "student_id is required"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        from .services import compute_student_results

        res = compute_student_results(student_id=student_id, course_id=course_id)
        return Response(res, status=status.HTTP_200_OK)


class GenerateStudentReport(APIView):
    """POST /api/giraph/generate_student_report/
    Form-data: file=<csv/xlsx>, courseId=<uuid>
    Returns JSON list of results for each student.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if 'file' not in request.FILES:
             return Response({"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        course_id = request.data.get("courseId") # Form data
        uploaded_file = request.FILES['file']
        
        name = uploaded_file.name.lower()
        if name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(uploaded_file)
        elif name.endswith('.csv'):
            df = pd.read_csv(uploaded_file)
        else:
            return Response({'detail': 'Please upload a valid CSV or Excel file.'}, status=status.HTTP_400_BAD_REQUEST)

        # Convert to records
        records = df.to_dict(orient='records')
        
        from .services import compute_student_results

        results = []
        for row in records:
            # Clean keys
            clean_row = {}
            student_id = None
            
            for k, v in row.items():
                key = str(k).strip()
                val = v
                if key.lower() == 'student_id':
                    student_id = str(val)
                elif pd.notnull(val): # only include non-null
                    try: 
                        clean_row[key] = float(val)
                    except (ValueError, TypeError):
                        pass # Ignore non-numeric
            
            if not student_id:
                continue

            grades_map = {k.lower(): v for k, v in clean_row.items()}
        
            res = compute_student_results(student_id=student_id, course_id=course_id, override_grades=clean_row)
 
            student_summary = { "student_id": student_id }
            
            for cc in res['course_contents']:
                student_summary[f"CC_{cc['name']}"] = cc['student_grade']
            
            for co in res['learning_outcomes']:
                 student_summary[f"CO_{co['name']}"] = co['calculated_score']
                 
            for po in res['program_outcomes']:
                 student_summary[f"PO_{po['name']}"] = po['calculated_score']
                 
            results.append(student_summary)

        return Response(results, status=status.HTTP_200_OK)


class DeleteProgramOutcome(APIView):
    """DELETE /api/giraph/delete_program_outcome
    Body: {"outcome_id": int}
    Only department heads can delete program outcomes
    """

    permission_classes = [IsAuthenticated]

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


class ParseSyllabus(APIView):
    """POST /api/giraph/parse_syllabus/
    
    Upload a PDF syllabus and extract course structure using LLM.
    Returns extracted course contents, outcomes, and suggested relations.
    The user can review and confirm before applying.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if "file" not in request.FILES:
            return Response(
                {"detail": "No file uploaded. Please upload a PDF file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        uploaded_file = request.FILES["file"]
        
        # Validate file type
        if not uploaded_file.name.lower().endswith(".pdf"):
            return Response(
                {"detail": "Only PDF files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Read file bytes
        pdf_bytes = uploaded_file.read()
        
        try:
            from .syllabus_service import process_syllabus
            result = process_syllabus(pdf_bytes)
            
            return Response({
                "message": "Syllabus parsed successfully. Please review and confirm.",
                "data": result,
            }, status=status.HTTP_200_OK)
            
        except Exception:
            return Response(
                {"detail": "Unable to process the syllabus. Please ensure the file is a valid PDF and try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ApplySyllabusImport(APIView):
    """POST /api/giraph/apply_syllabus_import/
    
    Apply the extracted syllabus structure after user confirmation.
    Creates nodes and relations in the database.
    
    Body: {
        "course_id": UUID,
        "course_contents": [{"name": str, "weight": int}],
        "course_outcomes": [{"name": str}],
        "relations": [{"content_index": int, "outcome_index": int, "strength": int}]
    }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get("course_id")
        course_contents = request.data.get("course_contents", [])
        course_outcomes = request.data.get("course_outcomes", [])
        relations = request.data.get("relations", [])
        
        if not course_id:
            return Response(
                {"detail": "course_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Verify course exists
        try:
            course = Program.objects.get(pk=course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        created_nodes = {"course_contents": [], "course_outcomes": []}
        created_relations = []
        
        # Create course content nodes
        cc_node_map = {}  # index -> Node
        for i, cc in enumerate(course_contents):
            name = cc.get("name", "").strip()
            if not name:
                continue
            
            # Check if node already exists
            existing = Node.objects.filter(
                name=name, 
                layer=LayerChoices.COURSE_CONTENT, 
                course=course
            ).first()
            
            if existing:
                cc_node_map[i] = existing
            else:
                node = Node.objects.create(
                    name=name,
                    layer=LayerChoices.COURSE_CONTENT,
                    course=course,
                )
                cc_node_map[i] = node
                created_nodes["course_contents"].append({
                    "id": node.id,
                    "name": node.name,
                })
        
        # Create course outcome nodes
        co_node_map = {}  # index -> Node
        for i, co in enumerate(course_outcomes):
            name = co.get("name", "").strip()
            if not name:
                continue
            
            # Check if node already exists
            existing = Node.objects.filter(
                name=name, 
                layer=LayerChoices.COURSE_OUTCOME, 
                course=course
            ).first()
            
            if existing:
                co_node_map[i] = existing
            else:
                node = Node.objects.create(
                    name=name,
                    layer=LayerChoices.COURSE_OUTCOME,
                    course=course,
                )
                co_node_map[i] = node
                created_nodes["course_outcomes"].append({
                    "id": node.id,
                    "name": node.name,
                })
        
        # Create relations (CC -> CO)
        for rel in relations:
            ci = rel.get("content_index")
            oi = rel.get("outcome_index")
            strength = rel.get("strength", 3)
            
            if ci not in cc_node_map or oi not in co_node_map:
                continue
            
            cc_node = cc_node_map[ci]
            co_node = co_node_map[oi]
            
            # Check if relation already exists
            existing_rel = Relation.objects.filter(
                node1=cc_node,
                node2=co_node,
            ).first()
            
            if existing_rel:
                # Update weight if different
                if existing_rel.weight != strength:
                    existing_rel.weight = strength
                    existing_rel.save(update_fields=["weight"])
            else:
                try:
                    relation = Relation.objects.create(
                        node1=cc_node,
                        node2=co_node,
                        weight=min(5, max(1, int(strength))),
                    )
                    created_relations.append({
                        "id": relation.id,
                        "from": cc_node.name,
                        "to": co_node.name,
                        "weight": relation.weight,
                    })
                except IntegrityError:
                    # Relation already exists, skip
                    pass
        
        return Response({
            "message": "Syllabus import applied successfully.",
            "created_nodes": created_nodes,
            "created_relations": created_relations,
        }, status=status.HTTP_201_CREATED)


class ClearCourseNodes(APIView):
    """POST /api/giraph/clear_course_nodes/
    
    Delete all course content and course outcome nodes for a specific course.
    This also removes all relations connected to those nodes.
    
    Body: {"course_id": UUID}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get("course_id")
        
        if not course_id:
            return Response(
                {"detail": "course_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Verify course exists
        try:
            course = Program.objects.get(pk=course_id)
        except Program.DoesNotExist:
            return Response(
                {"detail": f"Course {course_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Delete all course content and course outcome nodes for this course
        # Relations are automatically deleted via CASCADE
        deleted_cc = Node.objects.filter(
            course=course,
            layer=LayerChoices.COURSE_CONTENT
        ).delete()
        
        deleted_co = Node.objects.filter(
            course=course,
            layer=LayerChoices.COURSE_OUTCOME
        ).delete()
        
        return Response({
            "message": "Course nodes cleared successfully.",
            "deleted_course_contents": deleted_cc[0],
            "deleted_course_outcomes": deleted_co[0],
        }, status=status.HTTP_200_OK)

