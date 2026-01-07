from django.core.management.base import BaseCommand
from outcomes.models import (
    ProgramOutcome, CourseOutcome,
    CourseContent, ContentToCourseOutcome, CourseToProgramOutcome
)

class Command(BaseCommand):
    help = "Calculates Program Outcome (PO) scores based on weighted Course Outcome (CO) scores."

    def handle(self, *args, **kwargs):
        # 1) Önce CourseOutcome skorlarını hesaplayalım
        course_outcome_scores = {}

        for co in CourseOutcome.objects.all():
            ctco_links = ContentToCourseOutcome.objects.filter(course_outcome=co)
            
            weighted_sum = 0
            total_weight = 0
            
            for link in ctco_links:
                content_score = getattr(link.course_content, "score", None)

                if content_score is None:
                    self.stdout.write(
                        self.style.WARNING(f"[UYARI] {link.course_content.name} skor verilmemiş, 0 kabul edildi.")
                    )
                    content_score = 0

                weighted_sum += content_score * link.weight
                total_weight += link.weight

            co_score = weighted_sum / total_weight if total_weight > 0 else 0
            course_outcome_scores[co] = co_score

            self.stdout.write(f"[CO] {co.name}: {co_score:.2f}")


        self.stdout.write("\n--- PROGRAM OUTCOME HESAPLAMALARI ---\n")

        # 2) CourseOutcome skorlarından ProgramOutcome skorlarını hesaplayalım
        for po in ProgramOutcome.objects.all():
            ctpo_links = CourseToProgramOutcome.objects.filter(program_outcome=po)

            weighted_sum = 0
            total_weight = 0

            for link in ctpo_links:
                co_score = course_outcome_scores.get(link.course_outcome, 0)

                weighted_sum += co_score * link.weight
                total_weight += link.weight

            po_score = weighted_sum / total_weight if total_weight > 0 else 0

            self.stdout.write(self.style.SUCCESS(
                f"[PO] {po.name} ({po.description}): {po_score:.2f}"
            ))
