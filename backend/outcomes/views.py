from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd
from .models import CourseContent

@csrf_exempt
def upload_grades(request):
    if request.method == 'POST' and request.FILES.get('file'):
        xlsx_file = request.FILES['file']
        
        if not xlsx_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({'error': 'Please upload a valid Excel file.'}, status=400)
            
        try:
            df = pd.read_excel(xlsx_file)
            data = df.to_dict(orient='records')
            
            processed_data = []
            for record in data:
                student_id = record.get('student_id')
                if not student_id:
                    continue

                # Match column names with CourseContent nodes
                for column, grade in record.items():
                    try:
                        content_node = CourseContent.objects.get(name=column)
                        # TODO: Implement the forward pass logic here
                    except CourseContent.DoesNotExist:
                        continue
                
                processed_data.append(record)
            
            return JsonResponse(processed_data, safe=False)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'No file uploaded.'}, status=400)
