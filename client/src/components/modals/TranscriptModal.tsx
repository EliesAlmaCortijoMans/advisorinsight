import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-7xl h-[80vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Available Transcripts</h3>
          <div className="space-y-2">
            {transcripts.map((t) => (
              <button
                key={t.id}
                onClick={() => onTranscriptSelect(t)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentTranscript.id === t.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{t.title || 'Earnings Call'}</div>
                {t.time && (
                  <div className="text-sm text-gray-500 flex items-center mt-1">
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
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {currentTranscript.title || 'Earnings Call Transcript'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {currentTranscript.transcript?.map((item, index) => (
                <div key={index} className="mb-4">
                  <p className="font-medium text-gray-900">{item.name}:</p>
                  <div className="mt-1 space-y-2">
                    {item.speech.map((text, speechIndex) => (
                      <p key={speechIndex} className="text-gray-700">{text}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptModal; 