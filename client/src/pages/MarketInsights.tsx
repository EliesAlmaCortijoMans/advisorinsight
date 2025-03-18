import React, { useState, useEffect, useRef } from 'react';
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
  Mic,
  Loader2,
  Send
} from 'lucide-react';
import { FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import { IoMdClose, IoMdChatboxes } from 'react-icons/io';

interface IndicesData {
  us: {
    [key: string]: {
      name: string;
      price: number;
      change: number;
      change_percent: number;
    };
  };
  global: {
    [key: string]: {
      name: string;
      price: number;
      change: number;
      change_percent: number;
    };
  };
  sectors: {
    [key: string]: {
      name: string;
      price: number;
      change: number;
      change_percent: number;
    };
  };
  movers: {
    gainers: Array<{
      symbol: string;
      price: number;
      change: number;
      change_percent: number;
    }>;
    losers: Array<{
      symbol: string;
      price: number;
      change: number;
      change_percent: number;
    }>;
  };
  volume_leaders: Array<{
    symbol: string;
    volume: string;
    volume_change_percent: number;
    price: number;
    change_percent: number;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MarketInsights: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [indicesData, setIndicesData] = useState<IndicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchIndicesData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stock/indices/');
      if (!response.ok) {
        throw new Error('Failed to fetch indices data');
      }
      const data = await response.json();
      setIndicesData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch market data');
      console.error('Error fetching indices data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedQuestions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stock/chat/suggested-questions/');
      if (!response.ok) {
        throw new Error('Failed to fetch suggested questions');
      }
      const data = await response.json();
      setSuggestedQuestions(data.questions);
    } catch (err) {
      console.error('Error fetching suggested questions:', err);
    }
  };

  useEffect(() => {
    fetchIndicesData();
    fetchSuggestedQuestions();
    // Update data every 5 seconds
    const interval = setInterval(fetchIndicesData, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/api/stock/market-chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error('Error sending message:', err);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setMessage(question);
    handleSendMessage();
  };

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
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <div className="space-y-4">
              {indicesData?.us && Object.entries(indicesData.us).map(([symbol, data]) => (
                <div key={symbol} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{data.name}</span>
                      <div className="text-sm text-gray-500">${data.price.toLocaleString()}</div>
                    </div>
                    <div className={`flex items-center ${data.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      <span className="text-sm font-medium">
                        {data.change >= 0 ? '+' : ''}{data.change_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Markets Snapshot */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Global Markets
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {indicesData?.global && Object.entries(indicesData.global).map(([symbol, data]) => (
                <div key={symbol} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div>
                    <p className="font-medium">{data.name}</p>
                    <div className="text-sm text-gray-500">${data.price.toLocaleString()}</div>
                    <p className={`text-sm font-medium ${data.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {data.change >= 0 ? '+' : ''}{data.change_percent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sector Performance */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2" />
            Sector Performance
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <div className="space-y-3">
              {indicesData?.sectors && Object.entries(indicesData.sectors)
                .sort((a, b) => b[1].change_percent - a[1].change_percent) // Sort by performance
                .map(([symbol, data]) => (
                  <div key={symbol} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{data.name}</span>
                      <span className="text-sm text-gray-500">${data.price.toLocaleString()}</span>
                    </div>
                    <div className={`flex items-center ${data.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      <span className="text-sm font-medium">
                        {data.change >= 0 ? '+' : ''}{data.change_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
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
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Top Gainers</h3>
                <div className="space-y-2">
                  {indicesData?.movers.gainers.map((stock) => (
                    <div key={stock.symbol} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between">
                        <div>
                          <span className="font-medium">{stock.symbol}</span>
                          <div className="text-sm text-gray-500">${stock.price.toLocaleString()}</div>
                        </div>
                        <span className="text-green-500">+{stock.change_percent.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Top Losers</h3>
                <div className="space-y-2">
                  {indicesData?.movers.losers.map((stock) => (
                    <div key={stock.symbol} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between">
                        <div>
                          <span className="font-medium">{stock.symbol}</span>
                          <div className="text-sm text-gray-500">${stock.price.toLocaleString()}</div>
                        </div>
                        <span className="text-red-500">{stock.change_percent.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Volume Leaders */}
        <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Volume2 className="w-5 h-5 mr-2" />
            Volume Leaders
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <div className="space-y-3">
              {indicesData?.volume_leaders.map((stock) => (
                <div key={stock.symbol} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">Volume: {stock.volume}</p>
                        <span className={`text-xs ${stock.volume_change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({stock.volume_change_percent >= 0 ? '+' : ''}{stock.volume_change_percent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <span className={`${stock.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      {isChatOpen ? (
        <div className={`fixed bottom-6 right-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl transition-all duration-300 ${isExpanded ? 'h-[600px]' : 'h-[500px]'}`}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              AI Assistant - Market Insights
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1.5 rounded-full transition-colors duration-200 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className={`p-1.5 rounded-full transition-colors duration-200 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <IoMdClose size={16} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className={`overflow-y-auto p-4 space-y-4 ${isExpanded ? 'h-[320px]' : 'h-[220px]'}`}
          >
            {chatHistory.length === 0 && (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Hello! I'm your AI Assistant for Market Insights. I can help you analyze market trends, sector performance, and provide real-time financial data. Feel free to ask me anything about the current market conditions.
              </div>
            )}
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? `${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`
                      : `${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className="text-sm font-medium mb-2">Try asking about:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuestionClick("What are the top performing sectors today?")}
                className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Top performing sectors
              </button>
              <button
                onClick={() => handleQuestionClick("Which stocks have the highest trading volume?")}
                className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Highest volume stocks
              </button>
              <button
                onClick={() => handleQuestionClick("How are global markets performing today?")}
                className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Global markets performance
              </button>
              <button
                onClick={() => handleQuestionClick("What are today's biggest market movers?")}
                className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Biggest market movers
              </button>
              <button
                onClick={() => handleQuestionClick("Compare technology sector vs healthcare sector")}
                className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Sector comparison
              </button>
            </div>
          </div>

          {/* Chat Input */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about market insights..."
                className={`flex-1 p-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400' 
                    : 'bg-gray-100 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button
                onClick={handleSendMessage}
                className={`p-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white transition-colors duration-200`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsChatOpen(true)}
          className={`fixed bottom-6 right-6 ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } rounded-full p-4 shadow-lg transition-all duration-300 ease-in-out hover:scale-110 transform`}
        >
          <IoMdChatboxes size={24} className="animate-pulse" />
        </button>
      )}
    </div>
  );
};

export default MarketInsights; 