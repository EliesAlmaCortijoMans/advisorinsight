from django.urls import path
from . import views

urlpatterns = [
    # existing code
    path('transcribe-audio/', views.transcribe_audio, name='transcribe-audio'),
] 