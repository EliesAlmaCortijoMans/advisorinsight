import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CompanyHeader from './components/header/CompanyHeader';
import AnalysisTabs from './components/analysis/AnalysisTabs';
import AudioHistoryModal from './components/modals/AudioHistoryModal';
import { AnalysisTab } from './types';
import { audioHistory, transcriptContent, summaryContent } from './data/mockData';
import SentimentAnalysis from './components/analysis/SentimentAnalysis';
import FinancialMetrics from './components/analysis/FinancialMetrics';
import InvestorReactions from './components/analysis/InvestorReactions';
import MarketImpact from './components/analysis/MarketImpact';
import { Headphones } from 'lucide-react';
import TranscriptModal from './components/modals/TranscriptModal';
import SummaryModal from './components/modals/SummaryModal';
import { StockWebSocket } from './services/stockWebSocket';
import { fetchCompanyTranscripts } from './services/transcriptService';
import { fetchAudioHistory } from './services/audioService';
import { fetchEarningsSchedule } from './services/earningsService';

function App() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [activeTab, setActiveTab] = useState<AnalysisTab>('sentiment');
  const [showAudioHistory, setShowAudioHistory] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [stockWebSocket, setStockWebSocket] = useState<StockWebSocket | null>(null);
  const [stockData, setStockData] = useState({
    price: 0,
    change: 0,
    percentChange: 0,
    lastUpdate: Date.now()
  });
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [audioHistory, setAudioHistory] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any[]>([]);

  // Callback for handling price updates
  const handlePriceUpdate = useCallback((data: any) => {
    setStockData({
      price: data.price,
      change: data.change,
      percentChange: data.percentChange,
      lastUpdate: Date.now()
    });
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = StockWebSocket.getInstance(handlePriceUpdate);
    ws.connect();
    setStockWebSocket(ws);

    return () => {
      ws.disconnect();
    };
  }, []);

  // Subscribe to symbol when company changes
  useEffect(() => {
    const selectedCall = earningsData.find(call => call.company === selectedCompany);
    if (selectedCall && stockWebSocket) {
      stockWebSocket.subscribeToSymbol(selectedCall.symbol);
    }
  }, [selectedCompany, stockWebSocket, earningsData]);

  // Fetch transcripts when company changes
  useEffect(() => {
    const fetchTranscripts = async () => {
      if (selectedCompany) {
        const selectedCall = earningsData.find(call => call.company === selectedCompany);
        if (selectedCall?.symbol) {
          try {
            console.log('Fetching transcripts for:', selectedCall.symbol); // Debug log
            const transcriptData = await fetchCompanyTranscripts(selectedCall.symbol);
            setTranscripts(transcriptData);
            setSelectedTranscript(transcriptData[0]); // Set most recent transcript
          } catch (error) {
            console.error('Error fetching transcripts:', error);
          }
        } else {
          console.warn('No symbol found for company:', selectedCompany);
        }
      }
    };

    fetchTranscripts();
  }, [selectedCompany, earningsData]);

  // Add effect to fetch audio history when company changes
  useEffect(() => {
    const fetchAudio = async () => {
      if (selectedCompany) {
        const selectedCall = earningsData.find(call => call.company === selectedCompany);
        if (selectedCall?.symbol) {
          try {
            const audioData = await fetchAudioHistory(selectedCall.symbol);
            setAudioHistory(audioData);
          } catch (error) {
            console.error('Error fetching audio history:', error);
          }
        }
      }
    };

    fetchAudio();
  }, [selectedCompany, earningsData]);

  // Add useEffect to fetch earnings data
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const data = await fetchEarningsSchedule();
        setEarningsData(data);
      } catch (error) {
        console.error('Error fetching earnings:', error);
      }
    };

    fetchEarnings();
  }, []);

  const renderAnalysisContent = () => {
    switch (activeTab) {
      case 'sentiment':
        return <SentimentAnalysis />;
      case 'financial':
        return <FinancialMetrics />;
      case 'investor':
        return <InvestorReactions />;
      case 'market-impact':
        return <MarketImpact />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        selectedCompany={selectedCompany}
        calls={earningsData}
        onSelectCompany={setSelectedCompany}
      />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <CompanyHeader 
              company={selectedCompany}
              currentPrice={stockData.price}
              priceChange={stockData.change}
              priceChangePercent={stockData.percentChange}
              lastUpdate={stockData.lastUpdate}
            />
            <button 
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              onClick={() => setShowAudioHistory(true)}
            >
              <Headphones className="w-5 h-5 mr-2" />
              Listen to Call
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Transcript Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Call Transcription</h3>
                <button 
                  onClick={() => setShowFullTranscript(true)}
                  className="text-indigo-600 text-sm hover:text-indigo-800"
                >
                  View Full Transcript
                </button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {selectedTranscript?.transcript?.slice(0, 3).map((item: any, index: number) => (
                  <div key={index}>
                    <p className="font-medium text-gray-900">{item.name}:</p>
                    <p className="text-gray-600">{item.speech[0]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Key Highlights</h3>
                <button 
                  onClick={() => setShowFullSummary(true)}
                  className="text-indigo-600 text-sm hover:text-indigo-800"
                >
                  View Full Summary
                </button>
              </div>
              <div className="space-y-4">
                {summaryContent.keyHighlights.map((highlight, index) => (
                  <div key={index} className="bg-green-50 p-3 rounded-md">
                    <p className="text-green-800">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AnalysisTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {renderAnalysisContent()}
        </div>
      </div>

      {showAudioHistory && (
        <AudioHistoryModal 
          onClose={() => setShowAudioHistory(false)}
          audioHistory={audioHistory}
        />
      )}

      {showFullTranscript && (
        <TranscriptModal 
          onClose={() => setShowFullTranscript(false)} 
          transcripts={transcripts}
          currentTranscript={selectedTranscript}
          onTranscriptSelect={setSelectedTranscript}
        />
      )}
      {showFullSummary && (
        <SummaryModal onClose={() => setShowFullSummary(false)} />
      )}
    </div>
  );
}

export default App;