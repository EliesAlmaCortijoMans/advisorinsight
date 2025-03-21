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
    path('market-impact/medium-term/<str:symbol>/', views.get_medium_term_impact, name='medium_term_impact'),
    path('market-impact/long-term/<str:symbol>/', views.get_long_term_impact, name='long_term_impact'),
    path('news-sentiment/', views.news_sentiment, name='news-sentiment'),
    path('qa-analysis/<str:symbol>/<str:call_id>/', views.qa_analysis, name='qa-analysis'),
    path('financial-metrics/<str:symbol>/', views.get_financial_metrics, name='financial-metrics'),
    path('earnings-call-sentiment/', views.earnings_call_sentiment, name='earnings-call-sentiment'),
    path('key-highlights/', views.get_key_highlights, name='key-highlights'),
    path('chat/', views.chat, name='chat'),
    path('suggested-questions/', views.get_suggested_questions, name='suggested-questions'),
    path('indices/', views.get_indices_data, name='get_indices_data'),
    path('chat/market/', views.market_chat, name='market_chat'),
    path('market-chat/', views.market_chat, name='market_chat'),
    path('market-chat/suggested-questions/', views.get_market_suggested_questions, name='market_suggested_questions'),
    path('company-comparison/<str:symbols>/', views.get_company_comparison, name='company_comparison'),
] 