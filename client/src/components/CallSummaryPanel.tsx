import React from 'react';
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
  FileText
} from 'lucide-react';

interface CallSummaryPanelProps {
  call: {
    company: string;
    symbol: string;
    date: string;
    time: string;
    status: string;
    actualEPS?: number;
    expectedEPS?: number;
    revenue?: {
      value: string;
      change: string;
    };
    keyHighlights?: string[];
    guidance?: {
      revenue?: string;
      eps?: string;
    };
    marketImpact?: {
      priceChange: number;
      volumeChange: number;
    };
    sentiment?: {
      overall: number;
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  onViewFullSummary: () => void;
}

const CallSummaryPanel: React.FC<CallSummaryPanelProps> = ({ call, onViewFullSummary }) => {
  const { isDarkMode } = useTheme();

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
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
        {/* Header Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className={`text-xl font-semibold ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Key Highlights
                </h3>
             
              </div>
              <button
                onClick={onViewFullSummary}
                className={`text-sm hover:underline transition-colors duration-200 flex items-center ${
                  isDarkMode 
                    ? 'text-indigo-400 hover:text-indigo-300' 
                    : 'text-indigo-600 hover:text-indigo-700'
                }`}
              >
                <FileText className="w-4 h-4 mr-1" />
                View Full Highlights
              </button>
            </div>
            <div className={`flex items-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Calendar className="w-4 h-4 mr-2" />
              <span>{call.date} at {call.time}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar rounded-lg ${
          isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/80'
        } p-4`}>
          <div className="space-y-6">
            {/* Financial Performance */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <div className={`text-sm font-medium mb-2 flex items-center ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <DollarSign className="w-4 h-4 mr-1" />
                  EPS Performance
                </div>
                {call.status === 'past' && call.actualEPS !== undefined && call.expectedEPS !== undefined ? (
                  <>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className={`text-xl font-bold ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        ${call.actualEPS.toFixed(2)}
                      </span>
                      <span className={`text-sm font-medium ${
                        call.actualEPS > call.expectedEPS
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        vs ${call.expectedEPS.toFixed(2)} Est.
                      </span>
                    </div>
                    <div className={`mt-1 text-sm ${
                      call.actualEPS > call.expectedEPS
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {formatPercentage((call.actualEPS / call.expectedEPS - 1) * 100)} vs Estimate
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`mt-2 text-xl font-bold ${
                      isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      ${call.expectedEPS?.toFixed(2) || '-.--'}
                    </div>
                    <div className={`mt-1 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Estimated
                    </div>
                  </>
                )}
              </div>

              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <div className={`text-sm font-medium mb-2 flex items-center ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Revenue
                </div>
                {call.revenue ? (
                  <>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className={`text-xl font-bold ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {call.revenue.value}
                      </span>
                    </div>
                    <div className={`mt-1 text-sm ${
                      call.revenue.change.includes('+')
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {call.revenue.change} YoY
                    </div>
                  </>
                ) : (
                  <div className={`mt-2 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Not Available
                  </div>
                )}
              </div>
            </div>

            {/* Market Impact */}
            {call.marketImpact && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <h3 className={`text-sm font-medium mb-3 flex items-center ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <BarChart className="w-4 h-4 mr-1" />
                  Market Impact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center">
                      {call.marketImpact.priceChange >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`font-medium ${
                        call.marketImpact.priceChange >= 0
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {formatPercentage(call.marketImpact.priceChange)}
                      </span>
                    </div>
                    <div className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Price Change</div>
                  </div>
                  <div>
                    <div className={`font-medium ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      {formatPercentage(call.marketImpact.volumeChange)}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Volume Change</div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Highlights */}
            {call.keyHighlights && call.keyHighlights.length > 0 && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <h3 className={`text-sm font-medium mb-3 flex items-center ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Key Highlights
                </h3>
                <ul className="space-y-2">
                  {call.keyHighlights.map((highlight, index) => (
                    <li 
                      key={index}
                      className={`flex items-start text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      <span className={`mr-2 ${
                        isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                      }`}>•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Forward Guidance */}
            {call.guidance && (call.guidance.revenue || call.guidance.eps) && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <h3 className={`text-sm font-medium mb-3 flex items-center ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Target className="w-4 h-4 mr-1" />
                  Forward Guidance
                </h3>
                <div className="space-y-2">
                  {call.guidance.revenue && (
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>Revenue</span>
                      <span className="font-medium">{call.guidance.revenue}</span>
                    </div>
                  )}
                  {call.guidance.eps && (
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>EPS</span>
                      <span className="font-medium">{call.guidance.eps}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sentiment Analysis */}
            {call.sentiment && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <h3 className={`text-sm font-medium mb-3 flex items-center ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Call Sentiment
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className={`text-xs mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Overall Sentiment</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${
                          call.sentiment.overall >= 70
                            ? 'bg-green-500'
                            : call.sentiment.overall >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${call.sentiment.overall}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-right text-xs font-medium">
                      {call.sentiment.overall}%
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>Positive</div>
                      <div className="font-medium">{call.sentiment.positive}%</div>
                    </div>
                    <div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>Negative</div>
                      <div className="font-medium">{call.sentiment.negative}%</div>
                    </div>
                    <div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>Neutral</div>
                      <div className="font-medium">{call.sentiment.neutral}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallSummaryPanel; 