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
import MainHeader from './components/header/MainHeader';
import { formatDistanceToNow } from 'date-fns';

interface StockData {
  price: number | null;
  change: number | null;
  percentChange: number | null;
  lastUpdate: number;
  isLive: boolean;
  nextMarketOpen: number | null;
}

function App() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [activeTab, setActiveTab] = useState<AnalysisTab>('sentiment');
  const [showAudioHistory, setShowAudioHistory] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [stockData, setStockData] = useState<StockData>({
    price: null,
    change: null,
    percentChange: null,
    lastUpdate: Math.floor(Date.now() / 1000),
    isLive: false,
    nextMarketOpen: null
  });
  const [isLoadingStockPrice, setIsLoadingStockPrice] = useState(true);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [audioHistory, setAudioHistory] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePriceUpdate = useCallback((data: any) => {
    console.log('Received stock update:', data);
    
    if (!data.price && data.price !== 0) {
      console.error('Invalid price data received:', data);
      return;
    }

    setStockData({
      price: data.price,
      change: data.change,
      percentChange: data.percentChange,
      lastUpdate: data.timestamp || Math.floor(Date.now() / 1000),
      isLive: data.isLive,
      nextMarketOpen: data.nextMarketOpen
    });
    setIsLoadingStockPrice(false);
  }, []);

  // Initialize WebSocket once
  useEffect(() => {
    console.log('Initializing WebSocket');
    const ws = StockWebSocket.getInstance(handlePriceUpdate);
    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, [handlePriceUpdate]);

  // Subscribe to stock updates when company changes
  useEffect(() => {
    if (!selectedCompany) return;

    const selectedCall = earningsData.find(call => call.company === selectedCompany);
    if (!selectedCall?.symbol) {
      console.warn('No symbol found for company:', selectedCompany);
      return;
    }

    console.log('Subscribing to symbol:', selectedCall.symbol);
    setIsLoadingStockPrice(true);
    // Only reset price-related data, keep market status unchanged
    setStockData(prev => ({
      ...prev,
      price: null,
      change: null,
      percentChange: null,
      lastUpdate: Math.floor(Date.now() / 1000)
    }));

    const ws = StockWebSocket.getInstance();
    ws.subscribeToSymbol(selectedCall.symbol);

  }, [selectedCompany, earningsData]);

  // Fetch earnings data on mount
  useEffect(() => {
    const fetchEarnings = async () => {
      setIsLoadingEarnings(true);
      try {
        const data = await fetchEarningsSchedule();
        setEarningsData(data);
        // Select the first company by default if none is selected
        if (!selectedCompany && data.length > 0) {
          setSelectedCompany(data[0].company);
          setIsLoadingStockPrice(true);
        }
      } catch (error) {
        console.error('Error fetching earnings:', error);
        setError('Failed to fetch earnings data');
      } finally {
        setIsLoadingEarnings(false);
      }
    };

    fetchEarnings();
  }, []); // Note: we don't need selectedCompany in deps as we only want this to run on mount

  // Fetch transcripts when company changes
  useEffect(() => {
    const fetchTranscripts = async () => {
      if (!selectedCompany) return;

      const selectedCall = earningsData.find(call => call.company === selectedCompany);
      if (!selectedCall?.symbol) {
        console.warn('No symbol found for company:', selectedCompany);
        return;
      }

      try {
        console.log('Fetching transcripts for:', selectedCall.symbol);
        const transcriptData = await fetchCompanyTranscripts(selectedCall.symbol);
        setTranscripts(transcriptData);
        setSelectedTranscript(transcriptData[0]);
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      }
    };

    fetchTranscripts();
  }, [selectedCompany, earningsData]);

  // Fetch audio history when company changes
  useEffect(() => {
    const fetchAudio = async () => {
      if (!selectedCompany) return;

      const selectedCall = earningsData.find(call => call.company === selectedCompany);
      if (!selectedCall?.symbol) return;

      try {
        const audioData = await fetchAudioHistory(selectedCall.symbol);
        setAudioHistory(audioData);
      } catch (error) {
        console.error('Error fetching audio history:', error);
      }
    };

    fetchAudio();
  }, [selectedCompany, earningsData]);

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

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MainHeader 
        isMarketOpen={stockData.isLive}
        nextMarketOpen={stockData.nextMarketOpen}
      />
      <div className="flex flex-1">
        <Sidebar 
          selectedCompany={selectedCompany}
          calls={earningsData}
          onSelectCompany={(company) => {
            setSelectedCompany(company);
            // Only reset price-related data, keep market status unchanged
            setStockData(prev => ({
              ...prev,
              price: null,
              change: null,
              percentChange: null,
              lastUpdate: Math.floor(Date.now() / 1000)
            }));
            setIsLoadingStockPrice(true);
          }}
          isLoading={isLoadingEarnings}
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
                isLoading={isLoadingStockPrice}
              />
              {selectedCompany && (
                <button 
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  onClick={() => setShowAudioHistory(true)}
                >
                  <Headphones className="w-5 h-5 mr-2" />
                  Listen to Call
                </button>
              )}
            </div>

            {selectedCompany ? (
              <>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* Transcript Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium">Call Transcription</h3>
                      <button 
                        onClick={() => setShowFullTranscript(true)}
                        className="text-indigo-600 text-sm hover:text-indigo-800"
                      >
                        View Full Transcript
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                      {selectedTranscript?.transcript?.slice(0, 3).map((item: any, index: number) => (
                        <div key={index}>
                          <p className="font-medium text-gray-900">{item.name}:</p>
                          <p className="text-gray-600">{item.speech}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium">Key Highlights</h3>
                      <button 
                        onClick={() => setShowFullSummary(true)}
                        className="text-indigo-600 text-sm hover:text-indigo-800"
                      >
                        View Full Summary
                      </button>
                    </div>
                    {selectedTranscript?.summary && (
                      <div className="space-y-3 max-h-[200px] overflow-y-auto">
                        {selectedTranscript.summary.keyHighlights.map((highlight: string, index: number) => (
                          <div key={index} className="bg-green-50 p-2 rounded-md">
                            <p className="text-green-800">{highlight}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <AnalysisTabs 
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />

                {renderAnalysisContent()}
              </>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                Please select a company from the sidebar
              </div>
            )}
          </div>
        </div>
      </div>

      {showAudioHistory && (
        <AudioHistoryModal 
          onClose={() => setShowAudioHistory(false)}
          audioHistory={audioHistory}
        />
      )}

      {showFullTranscript && selectedTranscript && (
        <TranscriptModal 
          onClose={() => setShowFullTranscript(false)}
          transcripts={[selectedTranscript]}
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