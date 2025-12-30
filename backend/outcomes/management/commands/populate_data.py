from django.core.management.base import BaseCommand
from outcomes.models import ProgramOutcome, CourseOutcome, CourseContent, ContentToCourseOutcome, CourseToProgramOutcome

class Command(BaseCommand):
    help = 'Populates the database with sample graph data.'

    def handle(self, *args, **options):
        # Create Program Outcomes
        po1 = ProgramOutcome.objects.create(name='PO1', description='Engineering Knowledge')
        po2 = ProgramOutcome.objects.create(name='PO2', description='Problem Analysis')

        # Create Course Outcomes
        co1 = CourseOutcome.objects.create(name='CO1', description='Apply Core Concepts')
        co2 = CourseOutcome.objects.create(name='CO2', description='Analyze Problems')

        # Create Course Content
        cc1 = CourseContent.objects.create(name='Midterm', description='Midterm Exam')
        cc2 = CourseContent.objects.create(name='Final', description='Final Exam')
        cc3 = CourseContent.objects.create(name='Assignment 1', description='First Assignment')

        # Create relationships
        ContentToCourseOutcome.objects.create(course_content=cc1, course_outcome=co1, weight=3)
        ContentToCourseOutcome.objects.create(course_content=cc2, course_outcome=co1, weight=5)
        ContentToCourseOutcome.objects.create(course_content=cc3, course_outcome=co2, weight=4)

        CourseToProgramOutcome.objects.create(course_outcome=co1, program_outcome=po1, weight=4)
        CourseToProgramOutcome.objects.create(course_outcome=co2, program_outcome=po1, weight=2)
        CourseToProgramOutcome.objects.create(course_outcome=co2, program_outcome=po2, weight=5)

        self.stdout.write(self.style.SUCCESS('Successfully populated the database with sample data.'))
