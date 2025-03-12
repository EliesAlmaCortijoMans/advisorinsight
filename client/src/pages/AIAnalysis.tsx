import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  FileText,
  Brain,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  Search,
  Send,
  Upload,
  ChevronDown,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';

interface Message {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface DocumentAnalysis {
  title: string;
  type: '10K' | '10Q';
  date: string;
  summary: string;
  keyInsights: string[];
  sentiment: {
    score: number;
    label: 'Positive' | 'Neutral' | 'Negative';
  };
}

const AIAnalysis: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mock document for demonstration
  const mockDocument: DocumentAnalysis = {
    title: 'Apple Inc. Form 10-K',
    type: '10K',
    date: '2023-09-30',
    summary: 'Annual report showcasing strong financial performance with increased revenue in services and wearables.',
    keyInsights: [
      'Revenue growth of 8% year-over-year',
      'Services revenue reached all-time high',
      'Significant R&D investments in AI and ML',
      'Strong cash position and share buyback program'
    ],
    sentiment: {
      score: 0.75,
      label: 'Positive'
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        type: 'ai',
        content: 'Based on the 10-K analysis, Apple shows strong financial performance with particular growth in services revenue. The document indicates positive sentiment regarding future AI and ML investments.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className={`min-h-screen pt-12 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Selection & Analysis Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Document Upload/Selection */}
            <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Document Analysis
              </h2>
              <div className="space-y-4">
                <button
                  className={`w-full p-4 rounded-lg border-2 border-dashed
                    ${isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}
                    flex items-center justify-center transition-colors duration-200`}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Document
                </button>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Recent Documents</span>
                    <Filter className="w-4 h-4" />
                  </div>
                  <div className="space-y-2">
                    <button
                      className={`w-full p-3 rounded-lg text-left
                        ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}
                        flex items-center justify-between`}
                      onClick={() => setSelectedDocument(mockDocument)}
                    >
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <span>AAPL 10-K 2023</span>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Results */}
            {selectedDocument && (
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Analysis Results
                </h2>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h3 className="font-medium mb-2">{selectedDocument.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Filed on {selectedDocument.date}
                    </p>
                    <div className="flex items-center mb-4">
                      <div className={`px-3 py-1 rounded-full text-sm
                        ${selectedDocument.sentiment.label === 'Positive' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        }`}>
                        {selectedDocument.sentiment.label} Sentiment
                      </div>
                    </div>
                    <p className="text-sm mb-4">{selectedDocument.summary}</p>
                    <div className="space-y-2">
                      {selectedDocument.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                          <span className="text-sm">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-2rem)]">
            <div className={`flex-1 p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} flex flex-col`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  AI Chat Assistant
                </h2>
                <button 
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  onClick={() => setMessages([])}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-xl
                        ${message.type === 'user'
                          ? isDarkMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white'
                          : isDarkMode
                            ? 'bg-gray-700'
                            : 'bg-gray-100'
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 mt-2 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about the document..."
                    className={`flex-1 p-2 rounded-lg border-none focus:outline-none
                      ${isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'}`}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className={`p-2 rounded-lg ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-500'
                        : 'bg-blue-500 hover:bg-blue-400'
                    } text-white`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>AI will analyze the document and provide insights based on your questions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysis; 