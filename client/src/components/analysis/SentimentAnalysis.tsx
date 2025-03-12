import React, { useEffect, useState } from 'react';
import { Activity, MessageSquare } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SentimentAnalysisProps {
  symbol?: string;
}

interface EarningsCallSentiment {
  data: {
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    positive_keywords_count: number;
    negative_keywords_count: number;
    hesitation_markers_count: number;
  };
  symbol: string;
  is_mock: boolean;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ symbol }) => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<EarningsCallSentiment | null>(null);

  useEffect(() => {
    const fetchSentimentData = async () => {
      if (!symbol) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/stock/earnings-call-sentiment/?symbol=${symbol}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setSentimentData(data);
      } catch (err) {
        console.error('Error fetching sentiment data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentimentData();
  }, [symbol]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-indigo-400' : 'border-indigo-600'}`}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
        {error}
      </div>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return isDarkMode ? 'text-green-400' : 'text-green-600';
      case 'Negative':
        return isDarkMode ? 'text-red-400' : 'text-red-600';
      default:
        return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Overall Sentiment */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-indigo-950/50' : 'bg-indigo-50'}`}>
        <h4 className={`text-sm font-medium mb-4 flex items-center ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>
          <Activity className="w-4 h-4 mr-2" />
          Overall Sentiment
        </h4>
        <div className="flex items-baseline">
          <span className={`text-3xl font-bold ${getSentimentColor(sentimentData?.data.sentiment || 'Neutral')}`}>
            {sentimentData?.data.sentiment || 'Neutral'}
          </span>
        </div>
        <p className={`mt-2 text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
          Based on earnings call analysis
        </p>
      </div>

      {/* Keyword Analysis */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-emerald-950/50' : 'bg-emerald-50'}`}>
        <h4 className={`text-sm font-medium mb-4 flex items-center ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Keyword Analysis
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}>Positive Keywords</span>
            <span className={`font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>
              {sentimentData?.data.positive_keywords_count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}>Negative Keywords</span>
            <span className={`font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>
              {sentimentData?.data.negative_keywords_count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}>Hesitation Markers</span>
            <span className={`font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>
              {sentimentData?.data.hesitation_markers_count || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentAnalysis; 