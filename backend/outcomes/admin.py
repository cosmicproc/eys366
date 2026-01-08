from django.contrib import admin
from .models import (
    ProgramOutcome,
    CourseOutcome,
    CourseContent,
    ContentToCourseOutcome,
    CourseToProgramOutcome,
)

admin.site.register(ProgramOutcome)
admin.site.register(CourseOutcome)
admin.site.register(CourseContent)
admin.site.register(ContentToCourseOutcome)
admin.site.register(CourseToProgramOutcome)
