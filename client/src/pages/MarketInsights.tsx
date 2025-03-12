import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  TrendingUp, 
  Globe, 
  BarChart2, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Volume2,
  MessageSquare,
  Calendar,
  Brain,
  Bell,
  Search,
  Mic
} from 'lucide-react';

const MarketInsights: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen p-6 pt-24 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Market Overview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Key Indices Performance */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Key Indices
          </h2>
          <div className="space-y-4">
            {/* Placeholder for indices */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span>S&P 500</span>
                <span className="text-green-500">+1.2%</span>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span>NASDAQ</span>
                <span className="text-red-500">-0.8%</span>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span>Dow Jones</span>
                <span className="text-green-500">+0.5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Markets Snapshot */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Global Markets
          </h2>
          {/* Placeholder for global markets */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className="font-medium">FTSE 100</p>
              <p className="text-green-500">+0.7%</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className="font-medium">Nikkei 225</p>
              <p className="text-red-500">-0.3%</p>
            </div>
          </div>
        </div>

        {/* Sector Performance */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2" />
            Sector Performance
          </h2>
          {/* Placeholder for sector performance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Technology</span>
              <span className="text-green-500">+2.1%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Healthcare</span>
              <span className="text-red-500">-0.5%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Financials</span>
              <span className="text-green-500">+0.8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Movers and Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Gainers/Losers */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <ArrowUpCircle className="w-5 h-5 mr-2 text-green-500" />
            Top Movers
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Top Gainers</h3>
              <div className="space-y-2">
                {/* Placeholder for gainers */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between">
                    <span>AAPL</span>
                    <span className="text-green-500">+5.2%</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Top Losers</h3>
              <div className="space-y-2">
                {/* Placeholder for losers */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between">
                    <span>META</span>
                    <span className="text-red-500">-3.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Leaders */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Volume2 className="w-5 h-5 mr-2" />
            Volume Leaders
          </h2>
          <div className="space-y-3">
            {/* Placeholder for volume leaders */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">TSLA</p>
                  <p className="text-sm text-gray-500">Volume: 52.3M</p>
                </div>
                <span className="text-green-500">+2.4%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Sentiment and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Market Sentiment */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Market Sentiment
          </h2>
          {/* Placeholder for sentiment analysis */}
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className="font-medium">Overall Sentiment</p>
              <div className="flex items-center mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <span className="ml-2">70%</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            AI Insights
          </h2>
          {/* Placeholder for AI insights */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className="text-sm">Market showing strong bullish signals based on technical indicators and sentiment analysis.</p>
          </div>
        </div>
      </div>

      {/* Voice Assistant Bar */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4`}>
        <div className={`p-4 rounded-full shadow-lg flex items-center space-x-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Ask about market insights..."
            className={`flex-1 bg-transparent border-none focus:outline-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          />
          <button className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <Mic className="w-5 h-5 text-blue-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketInsights; 