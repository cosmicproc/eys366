from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/giraph/', include('giraph.urls')),
    path('api/users/', include("users.urls")),
    path('api/outcomes/', include("outcomes.urls")),
    path('api/programs/', include("programs.urls")),
]