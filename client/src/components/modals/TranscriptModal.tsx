import React from 'react';
import { X, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Transcript {
  id: string;
  title?: string;
  time?: string;
  transcript: Array<{
    name: string;
    speech: string[];
  }>;
}

interface TranscriptModalProps {
  onClose: () => void;
  transcripts: Transcript[];
  currentTranscript: Transcript;
  onTranscriptSelect: (transcript: Transcript) => void;
}

const TranscriptModal: React.FC<TranscriptModalProps> = ({ 
  onClose, 
  transcripts, 
  currentTranscript, 
  onTranscriptSelect 
}) => {
  const { isDarkMode } = useTheme();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose}></div>
        </div>

        <div className={`relative inline-block w-full max-w-7xl h-[80vh] overflow-hidden text-left align-middle transition-all transform rounded-2xl shadow-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex h-full">
            {/* Sidebar */}
            <div className={`w-64 border-r ${
              isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            } p-4 overflow-y-auto custom-scrollbar`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Available Transcripts
              </h3>
              <div className="space-y-2">
                {transcripts.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTranscriptSelect(t)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      currentTranscript.id === t.id
                        ? isDarkMode
                          ? 'bg-indigo-900/30 text-indigo-300 ring-1 ring-indigo-500/50'
                          : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/50'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700/50'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{t.title || 'Earnings Call'}</div>
                    {t.time && (
                      <div className={`text-sm flex items-center mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(t.time)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <div className={`p-6 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              } flex justify-between items-center`}>
                <h3 className={`text-xl font-semibold ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {currentTranscript.title || 'Earnings Call Transcript'}
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
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-6">
                  {currentTranscript.transcript?.map((item, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg animate-slide-in ${
                        isDarkMode 
                          ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      } transition-colors duration-200`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <p className={`font-medium ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {item.name}:
                      </p>
                      <div className="mt-2 space-y-2">
                        {item.speech.map((text, speechIndex) => (
                          <p 
                            key={speechIndex} 
                            className={`${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            {text}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptModal; 