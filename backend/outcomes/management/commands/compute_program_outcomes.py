from django.core.management.base import BaseCommand
from outcomes.models import (
    ProgramOutcome, CourseOutcome,
    CourseContent, ContentToCourseOutcome, CourseToProgramOutcome
)

class Command(BaseCommand):
    help = "Calculates Program Outcome (PO) scores based on weighted Course Outcome (CO) scores."

    def handle(self, *args, **kwargs):
        # Use the shared utility to compute CO and PO scores
        from outcomes.utils import compute_course_and_program_outcomes

        course_outcome_scores, program_outcome_scores = compute_course_and_program_outcomes()

        # Print the CO scores
        for co_name, co_score in course_outcome_scores.items():
            self.stdout.write(f"[CO] {co_name}: {co_score:.2f}")

        self.stdout.write("\n--- PROGRAM OUTCOME HESAPLAMALARI ---\n")

        # Print PO scores
        for po_name, po_score in program_outcome_scores.items():
            self.stdout.write(self.style.SUCCESS(
                f"[PO] {po_name}: {po_score:.2f}"
            ))
