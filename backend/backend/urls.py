from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/giraph/', include('giraph.urls')),
    path('api/', include("users.urls")),
    path('api/', include("outcomes.urls")),
    path('api/', include("programs.urls")),
]