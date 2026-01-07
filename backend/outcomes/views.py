from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd
from .models import CourseContent

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

            # Define header ignore rules
            def _should_ignore_header(name: str) -> bool:
                n = (name or "").strip().lower()
                if not n:
                    return True
                # Exact matches
                if n == 'student_id':
                    return True
                # Prefixes to ignore (No_*, Adı_*, Soyadı_*, Snf_*, Girme Durum_*, Harf Notu_*)
                prefixes = ('no_', 'adı', 'soyadı', 'snf_', 'snf', 'girme durum', 'harf notu', 'harf')
                return any(n.startswith(p) for p in prefixes)

            if mode == 'student' and student_id:
                # Filter rows for the student
                rows = [r for r in data if str(r.get('student_id')) == str(student_id)]
                if not rows:
                    return JsonResponse({'error': 'Student ID not found in file.'}, status=422)
                # Use first matching row, ignoring non-grade columns
                values = {}
                for k, v in rows[0].items():
                    if _should_ignore_header(k):
                        continue
                    if _is_number(v):
                        try:
                            values[k.strip()] = float(v)
                        except Exception:
                            continue

                # Persist student grades
                from .models import StudentGrade
                sid = str(student_id)
                for col, val in values.items():
                    normalized = str(col).rsplit('_', 1)[0].strip()
                    try:
                        cc = CourseContent.objects.filter(name__iexact=col).first() or CourseContent.objects.filter(name__iexact=normalized).first() or CourseContent.objects.filter(name__icontains=normalized).first()
                        if cc:
                            StudentGrade.objects.update_or_create(student_id=sid, course_content=cc, defaults={'score': float(val)})
                    except Exception:
                        continue
            else:
                # Use average across all students
                # Drop student id and other ignored columns before averaging
                cols_to_drop = [c for c in df.columns if _should_ignore_header(c)]
                df_numeric = df.drop(columns=cols_to_drop, errors='ignore')
                # Coerce to numeric where possible and compute mean
                df_numeric = df_numeric.apply(pd.to_numeric, errors='coerce')
                means = df_numeric.mean().dropna().to_dict()
                values = {k.strip(): float(v) for k, v in means.items()}
        elif request.method == 'POST':
            # Accept JSON body with values
            payload = request.body.decode('utf-8')
            import json
            body = json.loads(payload or '{}')
            if 'values' not in body:
                return JsonResponse({'error': 'No file uploaded or values provided.'}, status=400)
            values = {k: float(v) for k, v in body['values'].items()}
        else:
            return JsonResponse({'error': 'Invalid request method.'}, status=400)

        # Map values to CourseContent and set temporary score attribute
        from .models import CourseContent, ContentToCourseOutcome, CourseOutcome, ProgramOutcome

        # Clear any previous persisted CourseContent scores (we will set new ones below)
        CourseContent.objects.all().update(score=None)

        mapping = {}
        for col, val in values.items():
            # Normalize header name by removing trailing course codes like _0833AB
            normalized = str(col).rsplit('_', 1)[0].strip()

            # Ignore non-grade columns (added safety in case front-end missed some)
            def _should_ignore_header(name: str) -> bool:
                n = (name or "").strip().lower()
                if not n:
                    return True
                if n == 'student_id':
                    return True
                prefixes = ('no_', 'adı', 'soyadı', 'snf_', 'snf', 'girme durum', 'harf notu', 'harf')
                return any(n.startswith(p) for p in prefixes)

            if _should_ignore_header(col) or _should_ignore_header(normalized):
                continue

            # Find or create CourseContent for this header
            try:
                cc = CourseContent.objects.get(name__iexact=col)
            except CourseContent.DoesNotExist:
                try:
                    cc = CourseContent.objects.get(name__iexact=normalized)
                except CourseContent.DoesNotExist:
                    cc = CourseContent.objects.filter(name__icontains=normalized).first()

            if not cc:
                # Auto-create CourseContent using the normalized name
                cc, created = CourseContent.objects.get_or_create(name=normalized)

            # Persist score on CourseContent
            try:
                cc.score = float(val)
                cc.save(update_fields=['score'])
            except Exception:
                continue

            mapping[cc.name] = float(val)

        # Compute CourseOutcome and ProgramOutcome scores using shared utility
        from outcomes.utils import compute_course_and_program_outcomes
        course_outcome_scores, program_outcome_scores = compute_course_and_program_outcomes()

        response = {
            'mapped_values': mapping,
            'course_outcomes': course_outcome_scores,
            'program_outcomes': program_outcome_scores,
        }

        return JsonResponse(response, status=200)

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

