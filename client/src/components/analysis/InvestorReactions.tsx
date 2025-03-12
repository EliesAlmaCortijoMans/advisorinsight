import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useSelectedCompany } from '../../contexts/CompanyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}

interface NewsSentiment {
  articlesInLastWeek: number;
  companyNewsScore: number;
  bearishPercent: number;
  bullishPercent: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString([], { 
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true 
  });
};

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
        if (socialData.error) {
          console.warn(`Social sentiment data not available: ${socialData.error}`);
          setSocialSentiment(null);
        } else {
          setSocialSentiment(socialData);
        }

        // Fetch news sentiment data
        const newsResponse = await fetch(`/api/stock/news-sentiment/?symbol=${selectedCompany.symbol}`);
        const newsData = await newsResponse.json();
        if (newsData.error) {
          console.warn(`News sentiment data not available: ${newsData.error}`);
          setNewsSentiment(null);
        } else {
          setNewsSentiment(newsData);
        }

        // Fetch Q&A analysis only for past calls
        if (selectedCompany.latestTranscriptId && !selectedCompany.isOngoing) {
          const qaResponse = await fetch(`/api/stock/qa-analysis/${selectedCompany.symbol}/${selectedCompany.latestTranscriptId}/`);
          const qaData = await qaResponse.json();
          if (qaData.error) {
            console.warn(`Q&A analysis not available: ${qaData.error}`);
            setQAAnalysis(null);
          } else {
            setQAAnalysis(qaData);
          }
        } else {
          setQAAnalysis(null);
        }
      } catch (err) {
        console.error('Error fetching investor reactions data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCompany]);

  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center p-4 text-gray-500">
      <AlertCircle className="w-5 h-5 mr-2" />
      <span>{message}</span>
    </div>
  );

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
        {/* Q&A Analysis */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Q&A Analysis
            {selectedCompany?.isOngoing && (
              <span className="ml-2 text-sm text-gray-500">(Disabled for ongoing calls)</span>
            )}
          </h4>
          {!selectedCompany?.isOngoing && qaAnalysis ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Response Quality
                </div>
                <div className="flex items-center mt-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full dark:bg-gray-600">
                    <div 
                      className="h-2 bg-green-500 rounded-full" 
                      style={{ width: `${qaAnalysis.response_quality}%` }}
                    />
                  </div>
                  <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {qaAnalysis.response_quality}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Questions Addressed</span>
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {qaAnalysis.questions_addressed}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Follow-up Questions</span>
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {qaAnalysis.follow_up_questions}
                </span>
              </div>
            </div>
          ) : (
            <NoDataMessage message={selectedCompany?.isOngoing ? 
              "Q&A analysis is not available for ongoing calls" : 
              "No Q&A analysis available for this earnings call"} 
            />
          )}
        </div>

        {/* News Sentiment */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            News Sentiment
          </h4>
          {newsSentiment ? (
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-700'}>Articles Last Week</span>
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {newsSentiment.articlesInLastWeek}
                </span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-700'}>News Score</span>
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {(newsSentiment.companyNewsScore * 100).toFixed(1)}%
                </span>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Bullish</span>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {(newsSentiment.bullishPercent * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Bearish</span>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {(newsSentiment.bearishPercent * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <NoDataMessage message="No news sentiment data available" />
          )}
        </div>
      </div>

      {/* Social Media Sentiment */}
      <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          Social Media Sentiment
        </h4>
        {socialSentiment?.data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <span className={isDarkMode ? 'text-green-400' : 'text-green-700'}>Positive Mentions</span>
                <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>
                  {socialSentiment.data[0].positiveMention}
                </span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <span className={isDarkMode ? 'text-red-400' : 'text-red-700'}>Negative Mentions</span>
                <span className={`font-medium ${isDarkMode ? 'text-red-300' : 'text-red-900'}`}>
                  {socialSentiment.data[0].negativeMention}
                </span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <span className={isDarkMode ? 'text-blue-400' : 'text-blue-700'}>Overall Social Sentiment Score</span>
                <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                  {socialSentiment.data[0].score.toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Social Media Sentiment Graph */}
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={[...socialSentiment.data].reverse()} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                  <XAxis 
                    dataKey="atTime" 
                    tickFormatter={formatDate}
                    stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[-1, 1]} 
                    stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                    tickFormatter={(value) => value.toFixed(1)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      borderRadius: '0.375rem',
                      fontSize: '12px'
                    }}
                    labelFormatter={formatDate}
                    formatter={(value: number) => [value.toFixed(2), 'Sentiment Score']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <NoDataMessage message="No social media sentiment data available" />
        )}
      </div>
    </div>
  );
};

export default InvestorReactions; 