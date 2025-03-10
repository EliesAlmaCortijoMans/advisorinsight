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
    revenue?: number;
    keyHighlights?: string[];
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
        {/* Title Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className={`text-xl font-semibold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Key Highlights
            </h3>
            
          </div>
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
              {/* Highlights List */}
              <ul className="space-y-2">
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Significant increase in overall sales trends across 2022, 2023, and 2024.</span>
                </li>
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Notable shifts in product categories such as iPhones, iPads, Macs, and wearables.</span>
                </li>
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Key growth in Apple's service offerings, including iCloud, Apple Music, and App Store.</span>
                </li>
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Standout services contributing to revenue spikes.</span>
                </li>
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Identification of Apple's most successful or underperforming product/service based on 10-K filings.</span>
                </li>
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Significant sales growth or decline in key regions (e.g., Americas, Europe, Greater China).</span>
                </li>
                <li className={`flex items-start p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80'
                }`}>
                  <span className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full mr-3 ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Emerging markets or regions showing notable performance shifts.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallSummaryPanel; 