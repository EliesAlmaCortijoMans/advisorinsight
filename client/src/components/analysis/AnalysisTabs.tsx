import React from 'react';
import { Activity, DollarSign, MessageSquare, TrendingUp, Newspaper } from 'lucide-react';
import { AnalysisTab } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface TabConfig {
  id: AnalysisTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface AnalysisTabsProps {
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ activeTab, onTabChange }) => {
  const { isDarkMode } = useTheme();

  const tabs: TabConfig[] = [
    {
      id: 'market-impact',
      label: 'Market Impact',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Monitor market response and trends'
    },
    {
      id: 'financial',
      label: 'Financial Metrics',
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Review financial performance metrics'
    },
    {
      id: 'investor',
      label: 'Investor Reactions',
      icon: <MessageSquare className="w-4 h-4" />,
      description: 'Track investor responses and questions'
    },
    {
      id: 'sentiment',
      label: 'Sentiment Analysis',
      icon: <Activity className="w-4 h-4" />,
      description: 'Analyze call sentiment and key topics'
    },
    {
      id: 'news',
      label: 'News',
      icon: <Newspaper className="w-4 h-4" />,
      description: 'Latest news and media coverage'
    }
  ];

  return (
    <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} mb-4`}>
      <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              group flex items-center px-3 py-2 rounded-lg transition-all duration-200
              ${activeTab === tab.id
                ? isDarkMode
                  ? 'bg-blue-900/20 text-blue-400'
                  : 'bg-blue-50 text-blue-700'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
              ${activeTab === tab.id ? 'shadow-sm' : ''}
              relative
            `}
          >
            <div className="flex items-center">
              <span className={`
                transition-transform duration-200 transform
                ${activeTab === tab.id ? 'scale-105' : 'group-hover:scale-105'}
              `}>
                {tab.icon}
              </span>
              <span className="ml-2 text-sm font-medium whitespace-nowrap tracking-wide">{tab.label}</span>
            </div>
            
            {/* Active Tab Indicator */}
            {activeTab === tab.id && (
              <div className={`
                absolute bottom-0 left-0 right-0 h-0.5 rounded-full
                ${isDarkMode ? 'bg-blue-500' : 'bg-blue-600'}
                animate-fade-in
              `} />
            )}

            {/* Tooltip */}
            <div className={`
              absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5
              text-xs font-normal rounded-lg whitespace-nowrap opacity-0 invisible
              transition-all duration-200 z-10 shadow-lg
              ${isDarkMode
                ? 'bg-gray-800 text-gray-200'
                : 'bg-gray-900 text-white'
              }
              group-hover:opacity-100 group-hover:visible
            `}>
              {tab.description}
              <div className={`
                absolute top-full left-1/2 transform -translate-x-1/2 -mt-1
                border-4 border-transparent
                ${isDarkMode
                  ? 'border-t-gray-800'
                  : 'border-t-gray-900'
                }
              `} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnalysisTabs; 