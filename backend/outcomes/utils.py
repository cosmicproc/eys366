from .models import CourseOutcome, ProgramOutcome, CourseToProgramOutcome, ContentToCourseOutcome


def compute_course_and_program_outcomes():
    """Compute CO and PO scores based on CourseContent.score values.

    Returns two dicts: (course_outcome_scores, program_outcome_scores) where keys are names.
    """
    course_outcome_scores = {}
    for co in CourseOutcome.objects.all():
        ctco_links = ContentToCourseOutcome.objects.filter(course_outcome=co)
        weighted_sum = 0
        total_weight = 0
        for link in ctco_links:
            content_score = getattr(link.course_content, "score", None)
            if content_score is None:
                content_score = 0
            weighted_sum += content_score * link.weight
            total_weight += link.weight
        co_score = weighted_sum / total_weight if total_weight > 0 else 0
        course_outcome_scores[co.name] = co_score

    program_outcome_scores = {}
    for po in ProgramOutcome.objects.all():
        ctpo_links = CourseToProgramOutcome.objects.filter(program_outcome=po)
        weighted_sum = 0
        total_weight = 0
        for link in ctpo_links:
            co_score = course_outcome_scores.get(link.course_outcome.name, 0)
            weighted_sum += co_score * link.weight
            total_weight += link.weight
        po_score = weighted_sum / total_weight if total_weight > 0 else 0
        program_outcome_scores[po.name] = po_score

    return course_outcome_scores, program_outcome_scores
