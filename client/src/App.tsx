import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CompanyHeader from './components/header/CompanyHeader';
import AnalysisTabs from './components/analysis/AnalysisTabs';
import AudioHistoryModal from './components/modals/AudioHistoryModal';
import { AnalysisTab, EarningsCall, Company, StockData } from './types';
import SentimentAnalysis from './components/analysis/SentimentAnalysis';
import FinancialMetrics from './components/analysis/FinancialMetrics';
import InvestorReactions from './components/analysis/InvestorReactions';
import MarketImpact from './components/analysis/MarketImpact';
import News from './components/analysis/News';
import { Headphones } from 'lucide-react';
import TranscriptModal from './components/modals/TranscriptModal';
import SummaryModal from './components/modals/SummaryModal';
import { StockWebSocket } from './services/stockWebSocket';
import { fetchCompanyTranscripts, prefetchAllTranscripts } from './services/transcriptService';
import { fetchAudioHistory } from './services/audioService';
import { fetchEarningsSchedule } from './services/earningsService';
import MainHeader from './components/header/MainHeader';

type PriceUpdateCallback = (data: any) => void;

interface WebSocketMessage {
  type: string;
  symbol: string;
  price: number | null;
  change: number | null;
  percentChange: number | null;
  isLive: boolean;
  nextMarketOpen: number | null;
  lastUpdate?: number;
}

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('sentiment');
  const [showAudioHistory, setShowAudioHistory] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoadingStockPrice, setIsLoadingStockPrice] = useState(true);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [audioHistory, setAudioHistory] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsCall[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sidebarStockData, setSidebarStockData] = useState<Record<string, StockData>>({});
  const [loadingStockData, setLoadingStockData] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [nextMarketOpen, setNextMarketOpen] = useState<number | null>(null);

  const stockWebSocket = StockWebSocket.getInstance();

  const handlePriceUpdate = useCallback((data: WebSocketMessage) => {
    console.log('Received stock update:', data);
    
    if (!data.symbol || (data.price === undefined && data.price !== 0)) {
      console.error('Invalid price data received:', data);
      return;
    }

    const newStockData: StockData = {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      percentChange: data.percentChange,
      lastUpdate: data.lastUpdate || Math.floor(Date.now() / 1000),
      isLive: data.isLive,
      nextMarketOpen: data.nextMarketOpen
    };

    // Update both the selected company's data and the sidebar data
    if (selectedCompany?.symbol === data.symbol) {
      setStockData(newStockData);
      setIsLoadingStockPrice(false);
      setIsMarketOpen(data.isLive);
      setNextMarketOpen(data.nextMarketOpen);
    }

    setSidebarStockData(prev => ({
      ...prev,
      [data.symbol]: newStockData
    }));
    setLoadingStockData(false);
  }, [selectedCompany]);

  // Initialize WebSocket and subscribe to all companies
  useEffect(() => {
    if (!companies.length) return;

    console.log('Initializing WebSocket and subscribing to companies');
    const ws = StockWebSocket.getInstance();
    ws.connect();

    // Subscribe to all companies
    companies.forEach(company => {
      if (company.symbol) {
        console.log('Subscribing to symbol:', company.symbol);
        ws.subscribeToSymbol(company.symbol, handlePriceUpdate);
      }
    });

    return () => {
      companies.forEach(company => {
        if (company.symbol) {
          ws.unsubscribeFromSymbol(company.symbol);
        }
      });
      ws.disconnect();
    };
  }, [companies, handlePriceUpdate]);

  // Fetch earnings data on mount
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const data = await fetchEarningsSchedule();
        const formattedData: EarningsCall[] = data.map((call: any) => ({
          ...call,
          expectedEPS: parseFloat(call.expectedEPS),
          actualEPS: call.actualEPS ? parseFloat(call.actualEPS) : undefined,
          status: call.status as 'upcoming' | 'ongoing' | 'past'
        }));
        setEarningsData(formattedData);
        
        const companies = formattedData.map(call => ({
          symbol: call.symbol,
          name: call.company,
          status: call.status
        }));
        setCompanies(companies);
        
        // Prefetch transcripts for all companies
        const symbols = formattedData.map(call => call.symbol);
        await prefetchAllTranscripts(symbols);
        
        setIsLoadingEarnings(false);
      } catch (error) {
        console.error('Error fetching earnings:', error);
        setIsLoadingEarnings(false);
      }
    };
    fetchEarnings();
  }, []);

  // Fetch transcripts when company changes
  useEffect(() => {
    const fetchTranscripts = async () => {
      if (!selectedCompany) return;

      const selectedCall = earningsData.find(call => call.company === selectedCompany.name);
      if (!selectedCall?.symbol) {
        console.warn('No symbol found for company:', selectedCompany.name);
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

      const selectedCall = earningsData.find(call => call.company === selectedCompany.name);
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

  const onSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setStockData(null);
    setLoadingStockData(true);
    
    // Use existing data from sidebarStockData if available
    if (sidebarStockData[company.symbol]) {
      const data = sidebarStockData[company.symbol];
      setStockData(data);
      setLoadingStockData(false);
      setIsMarketOpen(data.isLive);
      setNextMarketOpen(data.nextMarketOpen);
    }
  };

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
      case 'news':
        return <News symbol={selectedCompany?.symbol} />;
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
        isMarketOpen={isMarketOpen}
        nextMarketOpen={nextMarketOpen}
      />
      <div className="flex flex-1">
        <Sidebar 
          selectedCompany={selectedCompany}
          calls={earningsData}
          onSelectCompany={onSelectCompany}
          isLoading={isLoadingEarnings}
          stockData={sidebarStockData}
        />

        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              {selectedCompany && (
                <CompanyHeader 
                  company={selectedCompany.name}
                  currentPrice={stockData?.price ?? null}
                  priceChange={stockData?.change ?? null}
                  priceChangePercent={stockData?.percentChange ?? null}
                  lastUpdate={stockData?.lastUpdate ?? Math.floor(Date.now() / 1000)}
                  isLoading={loadingStockData}
                />
              )}
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