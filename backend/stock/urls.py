from django.urls import path
from . import views

urlpatterns = [
    path('company-news/', views.company_news, name='company-news'),
    path('transcribe-audio/', views.transcribe_audio, name='transcribe-audio'),
    path('earnings-schedule/', views.get_earnings_schedule_view, name='earnings-schedule'),
    path('social-sentiment/', views.stock_social_sentiment, name='social-sentiment'),
    path('market-impact/<str:symbol>/', views.get_market_impact, name='market-impact'),
    path('test-market-impact/', views.test_market_impact, name='test-market-impact'),
    path('earnings-summary/<str:symbol>/<str:call_id>/', views.get_earnings_call_summary, name='earnings-summary'),
] 