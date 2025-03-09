from django.urls import path
from . import views

urlpatterns = [
    path('company-news/', views.company_news, name='company-news'),
    path('transcribe-audio/', views.transcribe_audio, name='transcribe-audio'),
    path('earnings-schedule/', views.get_earnings_schedule_view, name='earnings-schedule'),
    path('social-sentiment/', views.stock_social_sentiment, name='social-sentiment'),
] 