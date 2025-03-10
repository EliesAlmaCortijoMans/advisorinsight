import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSelectedCompany } from '../../contexts/CompanyContext';

interface MarketImpactData {
  intraday_range: {
    high: number;
    low: number;
    spread_percent: number;
  };
  volume: {
    total: number;
    unit: string;
  };
  time_range: {
    from: string;
    to: string;
  };
}

const MarketImpact: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'short' | 'medium' | 'long'>('short');
  const [marketData, setMarketData] = useState<MarketImpactData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { selectedCompany } = useSelectedCompany();

  useEffect(() => {
    const fetchMarketImpact = async () => {
      if (!selectedCompany?.symbol) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:8000/api/stock/market-impact/${selectedCompany.symbol}/`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch market impact data');
        }
        const data = await response.json();
        console.log('Market impact data:', data);
        setMarketData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load market impact data';
        setError(errorMessage);
        console.error('Error fetching market impact data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketImpact();
  }, [selectedCompany?.symbol]);

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
                : isDarkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {frame.charAt(0).toUpperCase() + frame.slice(1)} Term
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 p-4">{error}</div>
      ) : timeframe === 'short' && marketData ? (
        <div className="grid grid-cols-2 gap-6">
          <div className={`rounded-lg border p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
          }`}>
            <h4 className={`text-lg font-medium mb-4 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>Volatility Analysis</h4>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Intraday Range</div>
                <div className={`text-xl font-bold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  ${marketData.intraday_range.low.toFixed(2)} - ${marketData.intraday_range.high.toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">
                  {marketData.intraday_range.spread_percent.toFixed(1)}% Spread
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Volume</div>
                  <div className={`font-medium ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {marketData.volume.total}{marketData.volume.unit} shares
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Options Activity - Placeholder for now */}
          <div className={`rounded-lg border p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
          }`}>
            <h4 className={`text-lg font-medium mb-4 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>Options Activity</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Call Volume</div>
                  <div className={`text-xl font-bold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>Loading...</div>
                </div>
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Put Volume</div>
                  <div className={`text-xl font-bold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>Loading...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketImpact; 