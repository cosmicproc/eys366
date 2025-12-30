import pandas as pd
import requests
import os

# Create a sample DataFrame
data = {
    'student_id': [1, 2],
    'Midterm': [85, 90],
    'Final': [88, 92],
    'Assignment 1': [78, 85]
}
df = pd.DataFrame(data)

# Create an in-memory Excel file
excel_file = 'grades.xlsx'
df.to_excel(excel_file, index=False)

# URL of the upload endpoint
url = 'http://127.0.0.1:8000/outcomes/upload/'

# Open the file and send the request
try:
    with open(excel_file, 'rb') as f:
        files = {'file': (excel_file, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post(url, files=files)

    # Print the response
    print(response.json())

finally:
    # Clean up the created file
    if os.path.exists(excel_file):
        os.remove(excel_file)
