from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd
from .models import CourseContent
from .models import CourseOutcome, ProgramOutcome
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

def calculate_average_student(data):
    """
    Calculates the average grades for all students from a list of records.
    """
    if not data:
        return {}

    df = pd.DataFrame(data)
    df = df.drop(columns=['student_id'], errors='ignore')
    average_grades = df.mean().to_dict()
    
    return {'student_id': 'average', **average_grades}

def process_grades_data(data):
    """
    Takes a list of student records and returns both individual and average results.
    """
    # --- Individual Student Processing ---
    individual_results = []
    for record in data:
        student_id = record.get('student_id')
        if not student_id:
            continue
        # TODO: Forward pass logic for each student will be implemented here
        individual_results.append(record)
    
    # --- Average Student Processing ---
    average_result = calculate_average_student(data)
    # TODO: Forward pass logic for the average student will be implemented here

    # --- Combine Results ---
    return {
        'individual_results': individual_results,
        'average_result': average_result
    }

@csrf_exempt
def upload_grades(request):
    """
    Handles file upload (CSV or Excel) or a JSON body with values and returns
    computed CourseOutcome and ProgramOutcome scores.

    Expected POST form-data (preferred): file=<csv|xlsx>, mode=(average|student), student_id=<id>
    Or POST JSON: { "values": { "colName": number, ... } }
    """
    try:
        # Support both multipart file upload and direct JSON values
        if request.method == 'POST' and request.FILES.get('file'):
            uploaded_file = request.FILES['file']
            name = uploaded_file.name.lower()
            if name.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(uploaded_file)
            elif name.endswith('.csv'):
                df = pd.read_csv(uploaded_file)
            else:
                return JsonResponse({'error': 'Please upload a valid CSV or Excel file.'}, status=400)

            # Extract mode and optional student_id from POST data
            mode = request.POST.get('mode', 'average')
            student_id = request.POST.get('student_id')

            data = df.to_dict(orient='records')
            return JsonResponse(process_grades_data(data), status=200)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


def _is_number(val):
    try:
        float(val)
        return True
    except Exception:
        return False


class ProgramOutcomeList(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        outcomes = ProgramOutcome.objects.all().values('id', 'name')
        return Response(list(outcomes), status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'name is required'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        po = ProgramOutcome.objects.create(name=name)
        return Response({'id': po.id, 'name': po.name}, status=status.HTTP_201_CREATED)


class ProgramOutcomeDetail(APIView):
    permission_classes = [AllowAny]
    def get(self, request, pk):
        try:
            po = ProgramOutcome.objects.get(pk=pk)
        except ProgramOutcome.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': po.id, 'name': po.name}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        try:
            po = ProgramOutcome.objects.get(pk=pk)
        except ProgramOutcome.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        name = request.data.get('name', '').strip()
        if name:
            po.name = name
            po.save()
        return Response({'id': po.id, 'name': po.name}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            po = ProgramOutcome.objects.get(pk=pk)
        except ProgramOutcome.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        po.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseOutcomeList(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        outcomes = CourseOutcome.objects.all().values('id', 'name', 'description')
        return Response(list(outcomes), status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        if not name:
            return Response({'detail': 'name is required'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        co = CourseOutcome.objects.create(name=name, description=description)
        return Response({'id': co.id, 'name': co.name, 'description': co.description}, status=status.HTTP_201_CREATED)


class CourseOutcomeDetail(APIView):
    permission_classes = [AllowAny]
    def get(self, request, pk):
        try:
            co = CourseOutcome.objects.get(pk=pk)
        except CourseOutcome.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': co.id, 'name': co.name, 'description': co.description}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        try:
            co = CourseOutcome.objects.get(pk=pk)
        except CourseOutcome.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        if name:
            co.name = name
        if description is not None:
            co.description = description
        co.save()
        return Response({'id': co.id, 'name': co.name, 'description': co.description}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            co = CourseOutcome.objects.get(pk=pk)
        except CourseOutcome.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        co.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

