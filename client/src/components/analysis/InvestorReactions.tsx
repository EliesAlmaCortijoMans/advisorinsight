import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, TrendingUp, Loader2 } from 'lucide-react';
import { useSelectedCompany } from '../../contexts/CompanyContext';
import { useTheme } from '../../contexts/ThemeContext';

interface QAAnalysis {
  response_quality: number;
  questions_addressed: number;
  follow_up_questions: number;
}

interface SocialSentiment {
  data: Array<{
    atTime: string;
    mention: number;
    positiveMention: number;
    negativeMention: number;
    score: number;
  }>;
  is_mock: boolean;
}

interface NewsSentiment {
  articlesInLastWeek: number;
  companyNewsScore: number;
  bearishPercent: number;
  bullishPercent: number;
}

const InvestorReactions: React.FC = () => {
  const { selectedCompany } = useSelectedCompany();
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qaAnalysis, setQAAnalysis] = useState<QAAnalysis | null>(null);
  const [socialSentiment, setSocialSentiment] = useState<SocialSentiment | null>(null);
  const [newsSentiment, setNewsSentiment] = useState<NewsSentiment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany?.symbol) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch social sentiment data
        const socialResponse = await fetch(`/api/stock/social-sentiment/?symbol=${selectedCompany.symbol}`);
        const socialData = await socialResponse.json();
        if (socialData.error) throw new Error(socialData.error);
        setSocialSentiment(socialData);

        // Fetch news sentiment data
        const newsResponse = await fetch(`/api/stock/news-sentiment/?symbol=${selectedCompany.symbol}`);
        const newsData = await newsResponse.json();
        if (newsData.error) throw new Error(newsData.error);
        setNewsSentiment(newsData);

        // Fetch Q&A analysis if there's a selected transcript
        if (selectedCompany.latestTranscriptId) {
          const qaResponse = await fetch(`/api/stock/qa-analysis/${selectedCompany.symbol}/${selectedCompany.latestTranscriptId}/`);
          const qaData = await qaResponse.json();
          if (qaData.error) throw new Error(qaData.error);
          setQAAnalysis(qaData);
        }
      } catch (err) {
        console.error('Error fetching investor reactions data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCompany?.symbol, selectedCompany?.latestTranscriptId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Live Q&A Analysis */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Live Q&A Analysis
          </h4>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Response Quality
              </div>
              <div className="flex items-center mt-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full dark:bg-gray-600">
                  <div 
                    className="h-2 bg-green-500 rounded-full" 
                    style={{ width: `${qaAnalysis?.response_quality || 0}%` }}
                  />
                </div>
                <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {qaAnalysis?.response_quality || 0}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Questions Addressed</span>
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {qaAnalysis?.questions_addressed || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Follow-up Questions</span>
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {qaAnalysis?.follow_up_questions || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Past Calls Comparison */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            News & Media Coverage
          </h4>
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-700'}>Articles Last Week</span>
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {newsSentiment?.articlesInLastWeek || 0}
              </span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-700'}>News Score</span>
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {((newsSentiment?.companyNewsScore || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Social Media Sentiment */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Social Media Sentiment
          </h4>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
              <span className={isDarkMode ? 'text-green-400' : 'text-green-700'}>Positive Mentions</span>
              <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>
                {socialSentiment?.data[0]?.positiveMention || 0}
              </span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <span className={isDarkMode ? 'text-red-400' : 'text-red-700'}>Negative Mentions</span>
              <span className={`font-medium ${isDarkMode ? 'text-red-300' : 'text-red-900'}`}>
                {socialSentiment?.data[0]?.negativeMention || 0}
              </span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
              <span className={isDarkMode ? 'text-blue-400' : 'text-blue-700'}>Overall Sentiment</span>
              <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                {((socialSentiment?.data[0]?.score || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Market Sentiment
          </h4>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Bullish</span>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {((newsSentiment?.bullishPercent || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Bearish</span>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {((newsSentiment?.bearishPercent || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorReactions; 