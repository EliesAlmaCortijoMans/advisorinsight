import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const SentimentAnalysis: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-6">
        {/* Executive Sentiment */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-blue-900 mb-4">Executive Sentiment</h4>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-blue-600">+85%</span>
            <span className="ml-2 text-green-600">↑</span>
          </div>
          <p className="mt-2 text-sm text-blue-600">
            Positive tone increase from last call
          </p>
        </div>

        {/* Keyword Analysis */}
        <div className="bg-green-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-green-900 mb-4">Keyword & Emotion Detection</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-green-700">Positive Words</span>
              <span className="font-medium text-green-900">78</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Negative Words</span>
              <span className="font-medium text-red-900">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700">Hesitation Markers</span>
              <span className="font-medium text-orange-900">5</span>
            </div>
          </div>
        </div>

        {/* Comparative Analysis */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-purple-900 mb-4">Comparative Analysis</h4>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-purple-600">Top 15%</span>
          </div>
          <p className="mt-2 text-sm text-purple-600">vs Industry Average</p>
          <div className="mt-4 text-sm">
            <div className="flex items-center text-purple-700">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>25% more positive than competitors</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentAnalysis; 