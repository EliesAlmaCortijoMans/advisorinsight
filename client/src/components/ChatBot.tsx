import React, { useState, useRef, useEffect } from 'react';
import { IoMdChatboxes } from 'react-icons/io';
import { IoClose, IoSend } from 'react-icons/io5';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { chatService, ChatMessage } from '../services/chatService';
import { useTheme } from '../contexts/ThemeContext';

interface ChatBotProps {
  symbol: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ symbol }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [lastClickedQuestion, setLastClickedQuestion] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const allQuestionsRef = useRef<string[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestedQuestions();
    }
  }, [isOpen, symbol]);

  // Update suggested questions whenever askedQuestions changes
  useEffect(() => {
    if (allQuestionsRef.current.length > 0) {
      const newQuestions = allQuestionsRef.current.filter(q => !askedQuestions.includes(q));
      setSuggestedQuestions(newQuestions);
    }
  }, [askedQuestions]);

  const loadSuggestedQuestions = async () => {
    try {
      const questions = await chatService.getSuggestedQuestions(symbol);
      allQuestionsRef.current = questions;
      const newQuestions = questions.filter(q => !askedQuestions.includes(q));
      setSuggestedQuestions(newQuestions);
    } catch (error) {
      console.error('Error loading suggested questions:', error);
    }
  };

  const findExactQuestion = (input: string): string | null => {
    // First try exact match
    const exactMatch = suggestedQuestions.find(q => q === input);
    if (exactMatch) return exactMatch;

    // Then try case-insensitive exact match
    const caseInsensitiveMatch = suggestedQuestions.find(
      q => q.toLowerCase() === input.toLowerCase()
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    return null;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    // Store the current input before clearing it
    const currentInput = inputText;
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Handle question tracking
    if (lastClickedQuestion) {
      setAskedQuestions(prev => [...prev, lastClickedQuestion]);
      setLastClickedQuestion(null);
    } else {
      const matchedQuestion = findExactQuestion(currentInput);
      if (matchedQuestion) {
        setAskedQuestions(prev => [...prev, matchedQuestion]);
      }
    }

    try {
      const response = await chatService.sendMessage(currentInput, symbol);
      
      const botMessage: ChatMessage = {
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputText(question);
    setLastClickedQuestion(question);
  };

  return (
    <div className="fixed bottom-10 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } rounded-full p-4 shadow-lg transition-all duration-300 ease-in-out hover:scale-110 transform`}
        >
          <IoMdChatboxes size={24} className="animate-pulse" />
        </button>
      ) : (
        <div
          className={`${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-2xl transition-all duration-300 ease-in-out ${
            isExpanded ? 'w-96 h-[600px]' : 'w-80 h-[500px]'
          } flex flex-col`}
        >
          {/* Header */}
          <div className={`flex justify-between items-center p-4 ${
            isDarkMode ? 'bg-gray-700' : 'bg-blue-500'
          } text-white rounded-t-lg`}>
            <div className="flex items-center space-x-2">
              <IoMdChatboxes size={20} />
              <h3 className="font-semibold">AI Assistant - {symbol}</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`hover:${isDarkMode ? 'bg-gray-600' : 'bg-blue-600'} p-1.5 rounded-full transition-colors duration-200`}
              >
                {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`hover:${isDarkMode ? 'bg-gray-600' : 'bg-blue-600'} p-1.5 rounded-full transition-colors duration-200`}
              >
                <IoClose size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
          } space-y-4`}>
            {messages.length === 0 && (
              <div className="mb-4 animate-fade-in">
                <p className={`text-sm mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Hello! I'm your AI assistant for {symbol}. Here are some questions you can ask:
                </p>
                <div className="flex flex-col gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionClick(question)}
                      className={`text-left text-sm p-2 rounded-lg transition-all duration-200 ${
                        isDarkMode
                          ? 'text-blue-400 hover:bg-gray-700 hover:text-blue-300'
                          : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                      } transform hover:translate-x-1`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-slide-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.isUser
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-100'
                        : 'bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <div
                    className={`text-xs mt-1 ${
                      message.isUser
                        ? 'text-blue-200'
                        : isDarkMode
                          ? 'text-gray-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className={`p-3 rounded-2xl ${
                  isDarkMode ? 'bg-gray-700' : 'bg-white'
                }`}>
                  <div className="flex gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      isDarkMode ? 'bg-gray-400' : 'bg-gray-300'
                    } animate-bounce`} />
                    <div className={`w-2 h-2 rounded-full ${
                      isDarkMode ? 'bg-gray-400' : 'bg-gray-300'
                    } animate-bounce delay-100`} />
                    <div className={`w-2 h-2 rounded-full ${
                      isDarkMode ? 'bg-gray-400' : 'bg-gray-300'
                    } animate-bounce delay-200`} />
                  </div>
                </div>
              </div>
            )}
            {messages.length > 0 && suggestedQuestions.length > 0 && (
              <div className="mt-4 animate-fade-in">
                <p className={`text-sm mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Here are some follow-up questions you might be interested in:
                </p>
                <div className="flex flex-col gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionClick(question)}
                      className={`text-left text-sm p-2 rounded-lg transition-all duration-200 ${
                        isDarkMode
                          ? 'text-blue-400 hover:bg-gray-700 hover:text-blue-300'
                          : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                      } transform hover:translate-x-1`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-4 border-t ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about company insights..."
                className={`flex-1 p-2 rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkMode
                    ? 'bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-blue-400'
                } transition-all duration-200`}
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className={`${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white rounded-lg p-2 transition-all duration-200 hover:scale-105 transform ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <IoSend size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 