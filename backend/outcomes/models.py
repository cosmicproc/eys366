from django.db import models

class ProgramOutcome(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class CourseOutcome(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    program_outcomes = models.ManyToManyField(ProgramOutcome, through='CourseToProgramOutcome')

    def __str__(self):
        return self.name

class CourseContent(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    # Persistent numeric score (nullable) for this content item
    score = models.FloatField(null=True, blank=True)
    course_outcomes = models.ManyToManyField(CourseOutcome, through='ContentToCourseOutcome')

    def __str__(self):
        return self.name

class ContentToCourseOutcome(models.Model):
    id = models.AutoField(primary_key=True)
    course_content = models.ForeignKey(CourseContent, on_delete=models.CASCADE)
    course_outcome = models.ForeignKey(CourseOutcome, on_delete=models.CASCADE)
    weight = models.IntegerField(default=1)

    class Meta:
        unique_together = ('course_content', 'course_outcome')


class StudentGrade(models.Model):
    """Stores a student's numeric grade for a CourseContent item."""
    id = models.AutoField(primary_key=True)
    student_id = models.CharField(max_length=64, db_index=True)
    course_content = models.ForeignKey(CourseContent, on_delete=models.CASCADE)
    score = models.FloatField()

    class Meta:
        unique_together = ('student_id', 'course_content')

    def __str__(self):
        return f"{self.student_id} | {self.course_content.name} = {self.score}"
class CourseToProgramOutcome(models.Model):
    id = models.AutoField(primary_key=True)
    course_outcome = models.ForeignKey(CourseOutcome, on_delete=models.CASCADE)
    program_outcome = models.ForeignKey(ProgramOutcome, on_delete=models.CASCADE)
    weight = models.IntegerField(default=1)

    class Meta:
        unique_together = ('course_outcome', 'program_outcome')
