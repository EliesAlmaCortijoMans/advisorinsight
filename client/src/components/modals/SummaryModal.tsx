import React from 'react';
import { X, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { summaryContent } from '../../data/mockData';

interface SummaryModalProps {
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Call Summary</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
          <div className="space-y-8">
            <section>
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Key Highlights
              </h4>
              <ul className="space-y-2">
                {summaryContent.keyHighlights.map((highlight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Financial Performance
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Revenue</div>
                  <div className="text-2xl font-bold">{summaryContent.financialPerformance.revenue.value}</div>
                  <div className="text-sm text-green-600">{summaryContent.financialPerformance.revenue.change}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">EPS</div>
                  <div className="text-2xl font-bold">{summaryContent.financialPerformance.eps.value}</div>
                  <div className="text-sm text-green-600">{summaryContent.financialPerformance.eps.change}</div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Strategic Initiatives
              </h4>
              <ul className="space-y-2">
                {summaryContent.strategicInitiatives.map((initiative, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {initiative}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal; 