import React from 'react';
import { Activity, DollarSign, MessageSquare, TrendingUp } from 'lucide-react';
import { AnalysisTab } from '../../types';

interface AnalysisTabsProps {
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex gap-6 mb-6 border-b border-gray-200">
      <button
        onClick={() => onTabChange('sentiment')}
        className={`flex items-center pb-4 ${
          activeTab === 'sentiment'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Activity className="w-5 h-5 mr-2" />
        Sentiment Analysis
      </button>
      <button
        onClick={() => onTabChange('financial')}
        className={`flex items-center pb-4 ${
          activeTab === 'financial'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <DollarSign className="w-5 h-5 mr-2" />
        Financial Metrics
      </button>
      <button
        onClick={() => onTabChange('investor')}
        className={`flex items-center pb-4 ${
          activeTab === 'investor'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <MessageSquare className="w-5 h-5 mr-2" />
        Investor Reactions
      </button>
      <button
        onClick={() => onTabChange('market-impact')}
        className={`flex items-center pb-4 ${
          activeTab === 'market-impact'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <TrendingUp className="w-5 h-5 mr-2" />
        Market Impact
      </button>
    </div>
  );
};

export default AnalysisTabs; 