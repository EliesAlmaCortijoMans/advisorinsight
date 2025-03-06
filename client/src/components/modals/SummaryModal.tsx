import React from 'react';
import { X, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { summaryContent } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';

interface SummaryModalProps {
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ onClose }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose}></div>
        </div>

        <div className={`relative inline-block w-3/4 max-h-[80vh] overflow-hidden text-left align-middle transition-all transform rounded-2xl shadow-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          } flex justify-between items-center`}>
            <h3 className={`text-xl font-semibold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Call Summary
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)] custom-scrollbar">
            <div className="space-y-8">
              <section className="animate-fade-in">
                <h4 className={`text-lg font-medium mb-4 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <TrendingUp className={`w-5 h-5 mr-2 ${
                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                  Key Highlights
                </h4>
                <ul className="space-y-3">
                  {summaryContent.keyHighlights.map((highlight, index) => (
                    <li 
                      key={index} 
                      className={`flex items-start p-3 rounded-lg transition-all duration-200 animate-slide-in ${
                        isDarkMode 
                          ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span className={`mr-2 ${
                        isDarkMode ? 'text-green-400' : 'text-green-500'
                      }`}>•</span>
                      <span className={
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h4 className={`text-lg font-medium mb-4 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <Target className={`w-5 h-5 mr-2 ${
                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                  Financial Performance
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Revenue</div>
                    <div className={`text-2xl font-bold ${
                      isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>{summaryContent.financialPerformance.revenue.value}</div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>{summaryContent.financialPerformance.revenue.change}</div>
                  </div>
                  <div className={`p-4 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>EPS</div>
                    <div className={`text-2xl font-bold ${
                      isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>{summaryContent.financialPerformance.eps.value}</div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>{summaryContent.financialPerformance.eps.change}</div>
                  </div>
                </div>
              </section>

              <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
                <h4 className={`text-lg font-medium mb-4 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <Lightbulb className={`w-5 h-5 mr-2 ${
                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                  Strategic Initiatives
                </h4>
                <ul className="space-y-3">
                  {summaryContent.strategicInitiatives.map((initiative, index) => (
                    <li 
                      key={index} 
                      className={`flex items-start p-3 rounded-lg transition-all duration-200 animate-slide-in ${
                        isDarkMode 
                          ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      style={{ animationDelay: `${(index + 6) * 100}ms` }}
                    >
                      <span className={`mr-2 ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-500'
                      }`}>•</span>
                      <span className={
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }>{initiative}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal; 