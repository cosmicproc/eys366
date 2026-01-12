import json

import pandas as pd
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

# Import your calculation logic
from outcomes.utils import compute_course_and_program_outcomes

# Import your models
from .models import (  # Added StudentGrade if you use it
    CourseContent,
    CourseOutcome,
    ProgramOutcome,
    StudentGrade,
)


def calculate_average_student(data):
    """Calculates the average grades for all students from a list of records."""
    if not data:
        return {}
    df = pd.DataFrame(data)
    df = df.drop(columns=['student_id'], errors='ignore')
    # Use numeric_only=True to avoid errors if there are string columns
    average_grades = df.mean(numeric_only=True).to_dict()
    return {'student_id': 'average', **average_grades}

def _is_number(val):
    try:
        float(val)
        return True
    except Exception:
        return False

def _should_ignore_header(name: str) -> bool:
    """Helper to determine if a column header should be ignored."""
    n = (name or "").strip().lower()
    if not n:
        return True
    if n == 'student_id':
        return True
    prefixes = ('no_', 'adı', 'soyadı', 'snf_', 'snf', 'girme durum', 'harf notu', 'harf')
    return any(n.startswith(p) for p in prefixes)

@csrf_exempt
def upload_grades(request):
    """
    Handles file upload (CSV or Excel) or a JSON body.
    Persists data to CourseContent (for average) or StudentGrade (for specific students)
    and returns calculated outcomes.
    """
    try:
        values = {}
        mode = 'average'
        student_id = None

        # 1. HANDLE FILE UPLOAD
        if request.method == 'POST' and request.FILES.get('file'):
            uploaded_file = request.FILES['file']
            name = uploaded_file.name.lower()
            
            if name.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(uploaded_file)
            elif name.endswith('.csv'):
                df = pd.read_csv(uploaded_file)
            else:
                return JsonResponse({'error': 'Please upload a valid CSV or Excel file.'}, status=400)

            mode = request.POST.get('mode', 'average')
            student_id = request.POST.get('student_id')
            data = df.to_dict(orient='records')

            # --- Logic for Specific Student ---
            if mode == 'student' and student_id:
                # Find the specific student's row
                rows = [r for r in data if str(r.get('student_id')) == str(student_id)]
                if not rows:
                    return JsonResponse({'error': 'Student ID not found in file.'}, status=422)
                
                raw_row = rows[0]
                # Filter out ignored headers and non-numbers
                for k, v in raw_row.items():
                    if not _should_ignore_header(k) and _is_number(v):
                        values[k.strip()] = float(v)

                # Persist Student Grades
                sid = str(student_id)
                for col, val in values.items():
                    normalized = str(col).rsplit('_', 1)[0].strip()
                    # Try to find the CourseContent node
                    cc = (CourseContent.objects.filter(name__iexact=col).first() or 
                          CourseContent.objects.filter(name__iexact=normalized).first() or 
                          CourseContent.objects.filter(name__icontains=normalized).first())
                    
                    if cc:
                        StudentGrade.objects.update_or_create(
                            student_id=sid, 
                            course_content=cc, 
                            defaults={'score': float(val)}
                        )
                
                # NOTE: You might want to return specific student calculations here
                # For now, we fall through to the standard return or you can return early:
                return JsonResponse({'message': 'Student grades saved', 'mapped_values': values}, status=200)

            # --- Logic for Average (Class) Mode ---
            else:
                # Drop ignored columns
                cols_to_drop = [c for c in df.columns if _should_ignore_header(c)]
                df_numeric = df.drop(columns=cols_to_drop, errors='ignore')
                
                # Force numeric and calculate mean
                df_numeric = df_numeric.apply(pd.to_numeric, errors='coerce')
                means = df_numeric.mean().dropna().to_dict()
                values = {k.strip(): float(v) for k, v in means.items()}

        # 2. HANDLE JSON BODY (Restored functionality)
        elif request.method == 'POST':
            payload = request.body.decode('utf-8')
            body = json.loads(payload or '{}')
            if 'values' in body:
                values = {k: float(v) for k, v in body['values'].items()}
            else:
                return JsonResponse({'error': 'No file uploaded or values provided.'}, status=400)
        else:
            return JsonResponse({'error': 'Invalid request method.'}, status=405)

        # 3. PERSIST SCORES TO COURSE CONTENT (The "Important" part you deleted)
        
        # Reset current scores
        CourseContent.objects.all().update(score=None)

        mapping = {}
        for col, val in values.items():
            normalized = str(col).rsplit('_', 1)[0].strip()

            if _should_ignore_header(col) or _should_ignore_header(normalized):
                continue

            # Find or create CourseContent
            try:
                cc = CourseContent.objects.get(name__iexact=col)
            except CourseContent.DoesNotExist:
                try:
                    cc = CourseContent.objects.get(name__iexact=normalized)
                except CourseContent.DoesNotExist:
                    cc = CourseContent.objects.filter(name__icontains=normalized).first()

            if not cc:
                cc, created = CourseContent.objects.get_or_create(name=normalized)

            # Save the score
            cc.score = float(val)
            cc.save(update_fields=['score'])
            mapping[cc.name] = float(val)

        # 4. CALCULATE OUTCOMES (Restored functionality)
        course_outcome_scores, program_outcome_scores = compute_course_and_program_outcomes()

        response = {
            'mapped_values': mapping,
            'course_outcomes': course_outcome_scores,
            'program_outcomes': program_outcome_scores,
            # Provide per-student results and class average for the upload test expectations
            'individual_results': data if isinstance(data, list) else [],
            'average_result': calculate_average_student(data) if isinstance(data, list) else {},
        }

        return JsonResponse(response, status=200)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


# --- API Views (Kept from your new commit) ---

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