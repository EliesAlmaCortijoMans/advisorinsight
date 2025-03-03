import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MarketImpact: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'short' | 'medium' | 'long'>('short');

  return (
    <div className="space-y-8">
      {/* Time Frame Selector */}
      <div className="flex space-x-4">
        {['short', 'medium', 'long'].map((frame) => (
          <button
            key={frame}
            onClick={() => setTimeframe(frame as 'short' | 'medium' | 'long')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeframe === frame
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {frame.charAt(0).toUpperCase() + frame.slice(1)} Term
          </button>
        ))}
      </div>

      {timeframe === 'short' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Volatility Analysis</h4>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Intraday Range</div>
                <div className="text-xl font-bold text-gray-900">$182.5 - $189.3</div>
                <div className="text-sm text-blue-600">3.7% Spread</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Volume</div>
                  <div className="font-medium text-gray-900">2.5M shares</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">VWAP</div>
                  <div className="font-medium text-gray-900">$185.75</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Options Activity</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Call Volume</div>
                  <div className="text-xl font-bold text-gray-900">12,450</div>
                  <div className="text-sm text-green-600">↑ 234% vs Avg</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Put Volume</div>
                  <div className="text-xl font-bold text-gray-900">8,320</div>
                  <div className="text-sm text-red-600">↑ 156% vs Avg</div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Put/Call Ratio</div>
                <div className="font-medium text-gray-900">0.67</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {timeframe === 'medium' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Analyst Ratings</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700">Buy</p>
                  <p className="text-lg font-medium text-green-900">15</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700">Hold</p>
                  <p className="text-lg font-medium text-yellow-900">8</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-700">Sell</p>
                  <p className="text-lg font-medium text-red-900">2</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">Target</p>
                  <p className="text-lg font-medium text-blue-900">$185</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Sector Comparison</h4>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Relative Performance</div>
                <div className="text-xl font-bold text-green-600">+2.8%</div>
                <div className="text-sm text-gray-600">vs Sector Average</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Sector Rank</div>
                  <div className="font-medium text-gray-900">#3 of 25</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Beta</div>
                  <div className="font-medium text-gray-900">1.15</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {timeframe === 'long' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Executive Credibility</h4>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Promise Delivery Rate</div>
                <div className="flex items-center mt-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">85%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Guidance Accuracy</div>
                  <div className="font-medium text-gray-900">92%</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">CEO Confidence</div>
                  <div className="font-medium text-green-600">High</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Market Response Patterns</h4>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Key Phrase Impact</div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">"Strategic Investment"</span>
                    <span className="font-medium text-green-600">+1.2%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">"Market Challenges"</span>
                    <span className="font-medium text-red-600">-0.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketImpact; 