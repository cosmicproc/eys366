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
    Handles the file upload and passes the data for processing.
    """
    if request.method == 'POST' and request.FILES.get('file'):
        xlsx_file = request.FILES['file']
        
        if not xlsx_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({'error': 'Please upload a valid Excel file.'}, status=400)
            
        try:
            df = pd.read_excel(xlsx_file)
            data = df.to_dict(orient='records')
            
            # Pass the extracted data to the processing function
            final_response = process_grades_data(data)
            
            return JsonResponse(final_response, safe=False)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'No file uploaded.'}, status=400)
