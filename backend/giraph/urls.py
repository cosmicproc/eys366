from django.urls import path
from . import views

urlpatterns = [
    path('ping', views.ping),
    path('get_nodes', views.GetNodes.as_view()),
    path('new_node', views.NewNode.as_view()),
    path('new_relation', views.NewRelation.as_view()),
    path('update_node', views.UpdateNode.as_view()),
    path('update_relation', views.UpdateRelation.as_view()),
    path('delete_node', views.DeleteNode.as_view()),
    path('delete_relation', views.DeleteRelation.as_view()),
]
