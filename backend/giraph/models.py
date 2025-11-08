from django.db import models

class LayerChoices(models.TextChoices):
    COURSE_CONTENT = "course_content", "course_content"      # cc
    COURSE_OUTCOME = "course_outcome", "course_outcome"      # co
    PROGRAM_OUTCOME = "program_outcome", "program_outcome"   # po (cp)

class Node(models.Model):
    name = models.CharField(max_length=255)
    layer = models.CharField(max_length=32, choices=LayerChoices.choices)

    def __str__(self):
        return f"{self.id} | {self.layer} | {self.name}"

class Relation(models.Model):
    node1 = models.ForeignKey(Node, on_delete=models.CASCADE, related_name="outgoing")
    node2 = models.ForeignKey(Node, on_delete=models.CASCADE, related_name="incoming")
    weight = models.PositiveSmallIntegerField()  # 1..5

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["node1", "node2"],
                name="unique_relation_pair",
            ),
        ]

    def __str__(self):
        return f"{self.id} | {self.node1_id}->{self.node2_id} (w={self.weight})"
