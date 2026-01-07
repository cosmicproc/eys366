from typing import Dict, Any, Optional, List
from .models import Node, Relation, LayerChoices
from outcomes.models import StudentGrade, CourseContent


def compute_student_results(student_id: str, course_id: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
    """Compute student-specific scores for course contents, learning outcomes, and program outcomes.

    Returns a dict with keys: course_contents, learning_outcomes, program_outcomes
    Each entry is a list of objects with id, name, and student_grade/calculated_score.
    """
    # Fetch nodes
    if course_id:
        cc_nodes = list(Node.objects.filter(layer=LayerChoices.COURSE_CONTENT, course_id=course_id))
        co_nodes = list(Node.objects.filter(layer=LayerChoices.COURSE_OUTCOME, course_id=course_id))
    else:
        cc_nodes = list(Node.objects.filter(layer=LayerChoices.COURSE_CONTENT))
        co_nodes = list(Node.objects.filter(layer=LayerChoices.COURSE_OUTCOME))

    po_nodes = list(Node.objects.filter(layer=LayerChoices.PROGRAM_OUTCOME))

    # Build lookups
    node_by_id = {n.id: n for n in (cc_nodes + co_nodes + po_nodes)}

    # Map CC node id -> student grade (from StudentGrade if available, else None)
    cc_grades: Dict[int, float] = {}
    for n in cc_nodes:
        # Try to find CourseContent linked to node by name
        cc = CourseContent.objects.filter(name__iexact=n.name).first()
        grade_obj = None
        if cc:
            grade_obj = StudentGrade.objects.filter(student_id=str(student_id), course_content=cc).first()
        if grade_obj:
            cc_grades[n.id] = float(grade_obj.score)
        else:
            # Fallback to node.score or coursecontent.score or 0
            if hasattr(n, 'score') and n.score is not None:
                cc_grades[n.id] = float(n.score)
            elif cc and getattr(cc, 'score', None) is not None:
                cc_grades[n.id] = float(cc.score)
            else:
                cc_grades[n.id] = 0.0

    # Compute CourseOutcome scores using incoming relations from CC -> CO
    co_scores: Dict[int, float] = {}
    for co in co_nodes:
        incoming = Relation.objects.filter(node2_id=co.id, node1_id__in=[n.id for n in cc_nodes])
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
        incoming = Relation.objects.filter(node2_id=po.id, node1_id__in=[n.id for n in co_nodes])
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
        {"id": n.id, "name": n.name, "student_grade": cc_grades.get(n.id, 0.0)} for n in cc_nodes
    ]
    learning_outcomes = [
        {"id": n.id, "name": n.name, "calculated_score": round(co_scores.get(n.id, 0.0), 2)} for n in co_nodes
    ]
    program_outcomes = [
        {"id": n.id, "name": n.name, "calculated_score": round(po_scores.get(n.id, 0.0), 2)} for n in po_nodes
    ]

    return {
        "course_contents": course_contents,
        "learning_outcomes": learning_outcomes,
        "program_outcomes": program_outcomes,
    }