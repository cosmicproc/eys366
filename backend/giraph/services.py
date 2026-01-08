from typing import Any, Dict, List, Optional

from outcomes.models import CourseContent, StudentGrade
from programs.models import Program

from .models import LayerChoices, Node, Relation


def get_full_graph(course_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve all nodes and relations, optionally filtered by course."""
    # Program outcomes are ALWAYS included (they have course=None)
    program_outcome_nodes = list(
        Node.objects.filter(layer=LayerChoices.PROGRAM_OUTCOME).only(
            "id", "name", "layer", "course_id"
        )
    )

    # Filter course-specific nodes by course if provided
    if course_id:
        # Verify course exists
        course = Program.objects.get(pk=course_id)
        course_specific_nodes = list(
            Node.objects.filter(course=course)
            .exclude(layer=LayerChoices.PROGRAM_OUTCOME)
            .only("id", "name", "layer", "course_id")
        )
    else:
        course_specific_nodes = list(
            Node.objects.exclude(layer=LayerChoices.PROGRAM_OUTCOME).only(
                "id", "name", "layer", "course_id"
            )
        )

    # Combine all nodes
    nodes = course_specific_nodes + program_outcome_nodes
    node_ids = [n.id for n in nodes]

    # Get relations between these nodes
    rels = list(
        Relation.objects.filter(node1_id__in=node_ids, node2_id__in=node_ids).only(
            "id", "node1_id", "node2_id", "weight"
        )
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
        # Include score if present
        if hasattr(n, "score") and n.score is not None:
            pack["score"] = float(n.score)

        if n.layer == LayerChoices.COURSE_CONTENT:
            cc.append(pack)
        elif n.layer == LayerChoices.COURSE_OUTCOME:
            co.append(pack)
        else:
            po.append(pack)

    return {
        "course_contents": cc,
        "course_outcomes": co,
        "program_outcomes": po,
    }


def compute_student_results(
    student_id: Optional[str],
    course_id: Optional[str] = None,
    # Optional override for grades { "cc_name": score }
    override_grades: Optional[Dict[str, float]] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Compute student-specific scores for course contents, learning outcomes, and program outcomes.

    Returns a dict with keys: course_contents, learning_outcomes, program_outcomes
    Each entry is a list of objects with id, name, and student_grade/calculated_score.
    """
    # Fetch nodes
    if course_id:
        cc_nodes = list(
            Node.objects.filter(layer=LayerChoices.COURSE_CONTENT, course_id=course_id)
        )
        co_nodes = list(
            Node.objects.filter(layer=LayerChoices.COURSE_OUTCOME, course_id=course_id)
        )
    else:
        cc_nodes = list(Node.objects.filter(layer=LayerChoices.COURSE_CONTENT))
        co_nodes = list(Node.objects.filter(layer=LayerChoices.COURSE_OUTCOME))

    po_nodes = list(Node.objects.filter(layer=LayerChoices.PROGRAM_OUTCOME))

    # Build lookups
    node_by_id = {n.id: n for n in (cc_nodes + co_nodes + po_nodes)}

    # Map CC node id -> student grade (from StudentGrade if available, else None)
    cc_grades: Dict[int, float] = {}
    for n in cc_nodes:
        # 1. Start with override grades if provided
        score_val = None
        if override_grades:
            # Check for exact match
            score_val = override_grades.get(n.name)
            if score_val is None:
               # Case-insensitive match check
               for k, v in override_grades.items():
                   if k.lower() == n.name.lower():
                       score_val = v
                       break
        
        if score_val is not None:
            cc_grades[n.id] = float(score_val)
            continue
            
        # 2. Try to find CourseContent linked to node by name
        cc = CourseContent.objects.filter(name__iexact=n.name).first()
        grade_obj = None
        if cc and student_id:
            grade_obj = StudentGrade.objects.filter(
                student_id=str(student_id), course_content=cc
            ).first()
        if grade_obj:
            cc_grades[n.id] = float(grade_obj.score)
        else:
            # Fallback to node.score or coursecontent.score or 0
            if hasattr(n, "score") and n.score is not None:
                cc_grades[n.id] = float(n.score)
            elif cc and getattr(cc, "score", None) is not None:
                cc_grades[n.id] = float(cc.score)
            else:
                cc_grades[n.id] = 0.0

    # Compute CourseOutcome scores using incoming relations from CC -> CO
    co_scores: Dict[int, float] = {}
    for co in co_nodes:
        incoming = Relation.objects.filter(
            node2_id=co.id, node1_id__in=[n.id for n in cc_nodes]
        )
        weighted_sum = 0.0
        total_weight = 0.0
        for r in incoming:
            src_score = cc_grades.get(r.node1_id, 0.0)
            weighted_sum += src_score * r.weight
            total_weight += r.weight
        co_score = (weighted_sum / total_weight) if total_weight > 0 else 0.0
        co_scores[co.id] = co_score

    # Compute ProgramOutcome scores using incoming relations from CO -> PO
    po_scores: Dict[int, float] = {}
    for po in po_nodes:
        incoming = Relation.objects.filter(
            node2_id=po.id, node1_id__in=[n.id for n in co_nodes]
        )
        weighted_sum = 0.0
        total_weight = 0.0
        for r in incoming:
            src_score = co_scores.get(r.node1_id, 0.0)
            weighted_sum += src_score * r.weight
            total_weight += r.weight
        po_score = (weighted_sum / total_weight) if total_weight > 0 else 0.0
        po_scores[po.id] = po_score

    # Prepare return objects
    course_contents = [
        {"id": n.id, "name": n.name, "student_grade": cc_grades.get(n.id, 0.0)}
        for n in cc_nodes
    ]
    learning_outcomes = [
        {
            "id": n.id,
            "name": n.name,
            "calculated_score": round(co_scores.get(n.id, 0.0), 2),
        }
        for n in co_nodes
    ]
    program_outcomes = [
        {
            "id": n.id,
            "name": n.name,
            "calculated_score": round(po_scores.get(n.id, 0.0), 2),
        }
        for n in po_nodes
    ]

    return {
        "course_contents": course_contents,
        "learning_outcomes": learning_outcomes,
        "program_outcomes": program_outcomes,
    }
