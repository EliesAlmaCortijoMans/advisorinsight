import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  TrendingUp, 
  Target, 
  Lightbulb, 
  DollarSign, 
  Calendar,
  BarChart,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2
} from 'lucide-react';
import { fetchKeyHighlights, KeyHighlightsResponse } from '../services/keyHighlightsService';

interface CallSummaryPanelProps {
  call: {
    company: string;
    symbol: string;
    date: string;
    time: string;
    status: string;
    actualEPS?: number;
    expectedEPS?: number;
    revenue?: number;
    guidance?: {
      revenue?: number;
      eps?: number;
    };
    marketImpact?: {
      priceChange: number;
      volumeChange: number;
    };
    sentiment?: string;
  };
  onViewFullSummary: () => void;
}

const CallSummaryPanel: React.FC<CallSummaryPanelProps> = ({ 
  call,
  onViewFullSummary
}) => {
  const { isDarkMode } = useTheme();
  const [keyHighlights, setKeyHighlights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadKeyHighlights = async () => {
      if (!call.symbol) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchKeyHighlights(call.symbol);
        setKeyHighlights(data.responses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load key highlights');
        console.error('Error loading key highlights:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadKeyHighlights();
  }, [call.symbol]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading key highlights...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-center text-red-600">{error}</p>
        </div>
      );
    }

    if (!keyHighlights.length) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <FileText className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No key highlights available for this company
          </p>
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {keyHighlights.map((highlight, index) => (
          <li 
            key={index} 
            className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
              isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
            }`}
          >
            <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
              isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
            }`} />
            <span className={`${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>{highlight}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Background Gradient */}
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${
        isDarkMode 
          ? 'from-indigo-500/10 via-transparent to-purple-500/10' 
          : 'from-indigo-200/50 via-transparent to-purple-200/50'
      }`} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Title Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Key Highlights
          </h3>
        </div>

        {/* Scrollable Content */}
        <div className={`overflow-y-auto flex-1 rounded-lg ${
          isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/80'
        } p-4`}>
          <div className="space-y-6">
            {/* Key Highlights Section */}
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
            }`}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallSummaryPanel; 