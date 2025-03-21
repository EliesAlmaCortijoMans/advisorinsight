"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from stock import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/transcripts/<str:symbol>/', views.get_company_transcripts, name='company_transcripts'),
    path('api/audio-history/<str:symbol>/', views.get_audio_history, name='audio_history'),
    path('api/earnings-schedule/', views.get_earnings_schedule_view, name='earnings_schedule'),
    path('api/earnings-summary/<str:symbol>/<str:call_id>/', views.get_earnings_call_summary, name='earnings_summary'),
    path('api/stock/', include('stock.urls')),  # Include stock app URLs with correct prefix
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
