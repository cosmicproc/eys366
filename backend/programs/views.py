from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Program
from .serializers import ProgramSerializer

@api_view(["DELETE"])
def delete_program(request):
    """
    DELETE /api/program/delete_program
    Body: {"program_id": "<uuid>"}
    """
    program_id = request.data.get("program_id")
    if not program_id:
        return Response(
            {"detail": "program_id is required."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    try:
        program = Program.objects.get(pk=program_id)
    except Program.DoesNotExist:
        return Response(
            {"detail": f"Program {program_id} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    program.delete()
    return Response(
        {"message": "Program deleted."},
        status=status.HTTP_200_OK,
    )


@api_view(["PUT"])
def update_program(request):
    """
    PUT /api/program/update_program
    Body:
    {
      "program_id": "<uuid>",
      "name": "...",
      "university": "...",
      "department": "...",
      "lecturer": <user_id>
    }
    """
    program_id = request.data.get("program_id")

    if not program_id:
        return Response(
            {"detail": "program_id is required."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    try:
        program = Program.objects.get(pk=program_id)
    except Program.DoesNotExist:
        return Response(
            {"detail": f"Program {program_id} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ProgramSerializer(program, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
