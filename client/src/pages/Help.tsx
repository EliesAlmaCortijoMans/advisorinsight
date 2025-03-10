import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  HelpCircle,
  Book,
  Search,
  FileText,
  MessageCircle,
  Mail,
  Video,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  BookOpen,
  AlertCircle,
  Coffee
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

const Help: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How do I get started with market analysis?',
      answer: 'Begin by exploring the Market Insights page where you can view key market indices, sector performance, and real-time market sentiment. Use the AI Analysis tools to get deeper insights into specific companies or trends.',
      category: 'Getting Started'
    },
    {
      question: 'How does the AI Analysis work?',
      answer: 'Our AI Analysis tool processes financial documents (10-K, 10-Q reports) and earnings calls to extract key insights, sentiment, and trends. You can ask questions about the analyzed documents and get AI-powered responses based on the content.',
      category: 'AI Features'
    },
    {
      question: 'What APIs are supported?',
      answer: 'We currently support integration with Finnhub, Alpha Vantage, and OpenAI APIs. You can configure your API keys in the Settings page to access additional features and real-time data.',
      category: 'Integration'
    },
    {
      question: 'How do I set up notifications?',
      answer: 'Navigate to Settings > Notification Settings to configure alerts for earnings calls, market updates, AI insights, and price movements. You can customize each notification type according to your preferences.',
      category: 'Settings'
    }
  ];

  const guides: GuideItem[] = [
    {
      title: 'Quick Start Guide',
      description: 'Learn the basics and get started with the platform in minutes',
      link: '/guides/quickstart',
      icon: <PlayCircle className="w-6 h-6" />
    },
    {
      title: 'AI Analysis Tutorial',
      description: 'Master the AI-powered analysis tools and features',
      link: '/guides/ai-tutorial',
      icon: <BookOpen className="w-6 h-6" />
    },
    {
      title: 'Market Analysis Guide',
      description: 'Understanding market insights and technical analysis',
      link: '/guides/market-analysis',
      icon: <FileText className="w-6 h-6" />
    },
    {
      title: 'API Integration',
      description: 'Set up and configure external API integrations',
      link: '/guides/api-setup',
      icon: <AlertCircle className="w-6 h-6" />
    }
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 mr-2" />
            Help Center
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Find answers, guides, and support for all your questions
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className={`flex items-center p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Search for help articles, guides, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-transparent border-none focus:outline-none ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Start Guides */}
          <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Book className="w-5 h-5 mr-2" />
              Quick Start Guides
            </h2>
            <div className="space-y-4">
              {guides.map((guide, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg transition-colors duration-200 hover:bg-opacity-50 cursor-pointer
                    ${isDarkMode ? 'hover:bg-gray-700 bg-gray-700' : 'hover:bg-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-white'} mr-4`}>
                      {guide.icon}
                    </div>
                    <div>
                      <h3 className="font-medium flex items-center">
                        {guide.title}
                        <ExternalLink className="w-4 h-4 ml-2 opacity-50" />
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {guide.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className={`rounded-lg transition-colors duration-200
                    ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <button
                    className="w-full p-4 text-left flex items-center justify-between"
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.question ? null : faq.question)}
                  >
                    <span className="font-medium">{faq.question}</span>
                    {expandedFAQ === faq.question ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  {expandedFAQ === faq.question && (
                    <div className="px-4 pb-4">
                      <p className="text-gray-500 dark:text-gray-400">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Support */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-xl shadow-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Video className="w-8 h-8 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Video Tutorials</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Watch step-by-step guides and tutorials
            </p>
            <button className={`mt-4 px-4 py-2 rounded-lg text-sm
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              Watch Videos
            </button>
          </div>

          <div className={`p-6 rounded-xl shadow-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Mail className="w-8 h-8 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Contact Support</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Get help from our support team
            </p>
            <button className={`mt-4 px-4 py-2 rounded-lg text-sm
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              Send Message
            </button>
          </div>

          <div className={`p-6 rounded-xl shadow-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Coffee className="w-8 h-8 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Community Forum</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Join discussions with other users
            </p>
            <button className={`mt-4 px-4 py-2 rounded-lg text-sm
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              Visit Forum
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help; 