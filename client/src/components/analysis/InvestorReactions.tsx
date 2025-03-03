import React from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

const InvestorReactions: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Live Q&A Analysis */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Live Q&A Analysis</h4>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">Response Quality</div>
              <div className="flex items-center mt-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="ml-2 text-sm text-gray-600">85%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Questions Addressed</span>
                <span className="font-medium text-gray-900">12/15</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Follow-up Questions</span>
                <span className="font-medium text-gray-900">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Past Calls Comparison */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Comparison with Past Calls</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Confidence Level</span>
              <span className="font-medium text-green-600">↑ 15% vs Last Call</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Key Terms Changed</span>
              <span className="font-medium text-blue-600">+3 New Terms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Social Media Sentiment */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Social Media & News Sentiment</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-700">Positive Mentions</span>
              <span className="font-medium text-green-900">1,245</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-red-700">Negative Mentions</span>
              <span className="font-medium text-red-900">234</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-700">News Coverage</span>
              <span className="font-medium text-blue-900">85% Positive</span>
            </div>
          </div>
        </div>

        {/* Stock Price Impact */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Stock Price Correlation</h4>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">Price Movement</div>
              <div className="mt-2 flex items-baseline">
                <span className="text-2xl font-bold text-green-600">+4.2%</span>
                <span className="ml-2 text-sm text-gray-600">After Call</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Volume Increase</span>
                <span className="font-medium text-gray-900">+156%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Volatility</span>
                <span className="font-medium text-gray-900">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorReactions; 