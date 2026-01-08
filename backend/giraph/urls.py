from django.urls import path

from . import views

urlpatterns = [
    path("ping/", views.ping),
    path("new_node/", views.NewNode.as_view()),
    path("new_relation/", views.NewRelation.as_view()),
    path("get_nodes/", views.GetNodes.as_view()),  # ✅ CLASS-BASED
    path("update_node/", views.UpdateNode.as_view()),
    path("update_relation/", views.UpdateRelation.as_view()),
    path("delete_node/", views.DeleteNode.as_view()),
    path("delete_relation/", views.DeleteRelation.as_view()),
    path("get_program_outcomes/", views.GetProgramOutcomes.as_view()),
    path("apply_scores/", views.ApplyScores.as_view()),  # ✅ BU ÇOK KRİTİK
    path("reset_scores/", views.ResetScores.as_view()),
    path("calculate_student_results/", views.CalculateStudentResults.as_view()),
    path("generate_student_report/", views.GenerateStudentReport.as_view()),
    path("create_program_outcome/", views.CreateProgramOutcome.as_view()),
    path("update_program_outcome/", views.UpdateProgramOutcome.as_view()),
    path("delete_program_outcome/", views.DeleteProgramOutcome.as_view()),
]
