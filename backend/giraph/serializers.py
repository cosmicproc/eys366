from rest_framework import serializers

from .models import LayerChoices, Node, Relation


# /api/giraph/new_node
class NewNodeSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1, max_length=255)
    layer = serializers.ChoiceField(choices=[c[0] for c in LayerChoices.choices])


# /api/giraph/update_node
class UpdateNodeSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    name = serializers.CharField(min_length=1, max_length=255)


# /api/giraph/new_relation
class NewRelationSerializer(serializers.Serializer):
    node1_id = serializers.IntegerField()
    node2_id = serializers.IntegerField()
    weight = serializers.ChoiceField(choices=[1, 2, 3, 4, 5])

    # just cc→co or co→po allowed
    def validate(self, attrs):
        node1_id = attrs["node1_id"]
        node2_id = attrs["node2_id"]

        try:
            n1 = Node.objects.get(pk=node1_id)
        except Node.DoesNotExist:
            raise serializers.ValidationError({"node1_id": "Node not found"})

        try:
            n2 = Node.objects.get(pk=node2_id)
        except Node.DoesNotExist:
            raise serializers.ValidationError({"node2_id": "Node not found"})

        ok = (
            n1.layer == LayerChoices.COURSE_CONTENT
            and n2.layer == LayerChoices.COURSE_OUTCOME
        ) or (
            n1.layer == LayerChoices.COURSE_OUTCOME
            and n2.layer == LayerChoices.PROGRAM_OUTCOME
        )
        if not ok:
            raise serializers.ValidationError(
                "Invalid connection: allowed only cc→co or co→cp."
            )
        return attrs


# /api/giraph/update_relation
class UpdateRelationSerializer(serializers.Serializer):
    relation_id = serializers.IntegerField()
    weight = serializers.ChoiceField(choices=[1, 2, 3, 4, 5])


# /api/giraph/get_nodes
class RelationStubSerializer(serializers.Serializer):
    node1_id = serializers.IntegerField()
    node2_id = serializers.IntegerField()
    relation_id = serializers.IntegerField()
    weight = serializers.IntegerField()


class NodeWithRelationsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    relations = RelationStubSerializer(many=True)


class GetNodesResponseSerializer(serializers.Serializer):
    course_contents = NodeWithRelationsSerializer(many=True)
    course_outcomes = NodeWithRelationsSerializer(many=True)
    program_outcomes = NodeWithRelationsSerializer(many=True)
