import React, { useEffect, useState, useMemo } from 'react';
import { ArrowUpRight, TrendingUp, MessageSquare, Activity } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SentimentAnalysisProps {
  symbol?: string;
}

interface SentimentData {
  atTime: string;
  mention: number;
  positiveScore: number;
  negativeScore: number;
  positiveMention: number;
  negativeMention: number;
  score: number;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ symbol }) => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ is_mock: boolean } | null>(null);

  useEffect(() => {
    const fetchSentimentData = async () => {
      console.log('Fetching sentiment data for symbol:', symbol);
      if (!symbol) {
        console.log('No symbol provided, skipping fetch');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('Making API request to:', `http://localhost:8000/api/social-sentiment/?symbol=${symbol}`);
        const response = await fetch(`http://localhost:8000/api/social-sentiment/?symbol=${symbol}`);
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        console.log('Received sentiment data:', data);
        console.log('Data length:', data.data.length);
        console.log('First data point:', data.data[0]);
        setSentimentData(data.data);
        setData(data.data.length > 0 ? data.data[0] : null);
      } catch (err) {
        console.error('Error fetching sentiment data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentimentData();
  }, [symbol]);

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    console.log('Calculating aggregated metrics from data:', sentimentData);
    const metrics = sentimentData.reduce((acc, curr) => {
      const mentions = curr.mention || 0;
      const positiveMentions = curr.positiveMention || 0;
      const negativeMentions = curr.negativeMention || 0;
      
      console.log('Processing data point:', {
        mentions,
        positiveMentions,
        negativeMentions,
        currentTotal: acc.totalMentions
      });
      
      acc.totalMentions += mentions;
      acc.totalPositive += positiveMentions;
      acc.totalNegative += negativeMentions;
      acc.avgScore += curr.score || 0;
      return acc;
    }, {
      totalMentions: 0,
      totalPositive: 0,
      totalNegative: 0,
      avgScore: 0
    });

    if (sentimentData.length > 0) {
      metrics.avgScore = metrics.avgScore / sentimentData.length;
    }

    console.log('Final calculated metrics:', metrics);
    return metrics;
  }, [sentimentData]);

  // Convert sentiment score to percentage for display (-1 to 1 → 0 to 100)
  const sentimentToPercentage = (score: number) => {
    const percentage = ((score + 1) * 50);
    console.log('Converting score to percentage:', score, '→', percentage);
    return percentage.toFixed(1);
  };

  // Calculate 24h change
  const calculateChange = () => {
    if (sentimentData.length >= 2) {
      const change = sentimentData[0].score - sentimentData[sentimentData.length - 1].score;
      console.log('Calculated 24h change:', change);
      return (change * 100).toFixed(1);
    }
    return '0.0';
  };

  // Prepare chart data with proper time formatting
  const chartData = {
    labels: sentimentData.map(d => {
      const date = new Date(d.atTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: 'Sentiment Score',
        data: sentimentData.map(d => ((d.score + 1) * 50)), // Convert to 0-100 scale
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
          return gradient;
        },
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `Sentiment: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        beginAtZero: true,
        max: 100,
        grid: {
          display: false
        },
        ticks: {
          callback: function(value: any) {
            return `${value}%`;
          },
          stepSize: 20
        }
      },
      x: {
        type: 'category' as const,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6,
          maxRotation: 0
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
      {data?.is_mock && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Note: Using simulated data as real-time sentiment is not available.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-6">
        {/* Overall Sentiment Score */}
        <div className="bg-indigo-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-indigo-900 mb-4 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Overall Sentiment
          </h4>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-indigo-600">
              {sentimentToPercentage(aggregatedMetrics.avgScore)}%
            </span>
            {aggregatedMetrics.avgScore > 0 ? (
              <span className="ml-2 text-green-600">↑</span>
            ) : (
              <span className="ml-2 text-red-600">↓</span>
            )}
          </div>
          <p className="mt-2 text-sm text-indigo-600">
            Based on social media sentiment
          </p>
        </div>

        {/* Mention Analysis */}
        <div className="bg-emerald-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-emerald-900 mb-4 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Social Mentions
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-emerald-700">Total Mentions</span>
              <span className="font-medium text-emerald-900">{aggregatedMetrics.totalMentions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Positive</span>
              <span className="font-medium text-emerald-900">{aggregatedMetrics.totalPositive}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Negative</span>
              <span className="font-medium text-emerald-900">{aggregatedMetrics.totalNegative}</span>
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-blue-900 mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Sentiment Trend
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-blue-700">24h Change</span>
            {sentimentData.length >= 2 && (
              <span className={`font-medium ${
                sentimentData[0].score > sentimentData[sentimentData.length - 1].score
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {calculateChange()}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-blue-600">
            {sentimentData.length >= 2 && sentimentData[0].score > sentimentData[sentimentData.length - 1].score
              ? 'Positive trend'
              : 'Negative trend'
            }
          </div>
        </div>
      </div>

      {/* Sentiment Chart */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h4 className="text-lg font-medium text-gray-900 mb-6">Sentiment Timeline</h4>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default SentimentAnalysis; 