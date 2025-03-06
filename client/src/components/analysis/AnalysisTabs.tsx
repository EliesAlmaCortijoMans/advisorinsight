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
      id: 'sentiment',
      label: 'Sentiment Analysis',
      icon: <Activity className="w-5 h-5" />,
      description: 'Analyze call sentiment and key topics'
    },
    {
      id: 'financial',
      label: 'Financial Metrics',
      icon: <DollarSign className="w-5 h-5" />,
      description: 'Review financial performance metrics'
    },
    {
      id: 'investor',
      label: 'Investor Reactions',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Track investor responses and questions'
    },
    {
      id: 'market-impact',
      label: 'Market Impact',
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Monitor market response and trends'
    },
    {
      id: 'news',
      label: 'News',
      icon: <Newspaper className="w-5 h-5" />,
      description: 'Latest news and media coverage'
    }
  ];

  return (
    <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
      <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              group flex items-center px-4 py-3 rounded-lg transition-all duration-200
              ${activeTab === tab.id
                ? isDarkMode
                  ? 'bg-indigo-900/30 text-indigo-300'
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
              ${activeTab === tab.id ? 'shadow-sm' : ''}
              relative
            `}
          >
            <div className="flex items-center">
              <span className={`
                transition-transform duration-200 transform
                ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'}
              `}>
                {tab.icon}
              </span>
              <span className="ml-2 font-medium whitespace-nowrap">{tab.label}</span>
            </div>
            
            {/* Active Tab Indicator */}
            {activeTab === tab.id && (
              <div className={`
                absolute bottom-0 left-0 right-0 h-0.5 rounded-full
                ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'}
                animate-fade-in
              `} />
            )}

            {/* Tooltip */}
            <div className={`
              absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5
              text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible
              transition-all duration-200 z-10
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