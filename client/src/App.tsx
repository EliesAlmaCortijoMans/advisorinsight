import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Headphones, FileText, Radio, ToggleLeft, ToggleRight, Play, Pause } from 'lucide-react';
import TranscriptModal from './components/modals/TranscriptModal';
import SummaryModal from './components/modals/SummaryModal';
import { StockWebSocket } from './services/stockWebSocket';
import { fetchCompanyTranscripts, prefetchAllTranscripts } from './services/transcriptService';
import { fetchAudioHistory } from './services/audioService';
import { fetchEarningsSchedule } from './services/earningsService';
import MainHeader from './components/header/MainHeader';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import CallSummaryPanel from './components/CallSummaryPanel';

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

const AppContent: React.FC = () => {
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
  const { isDarkMode } = useTheme();
  const [isLiveCaptionOn, setIsLiveCaptionOn] = useState(false);
  const [isListeningLive, setIsListeningLive] = useState(false);
  const [isPlayingLiveAudio, setIsPlayingLiveAudio] = useState(false);
  const [isConnectingAudio, setIsConnectingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      volumeChange: null,
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

  const isCallOngoing = selectedCompany && earningsData.find(
    call => call.company === selectedCompany.name && call.status === 'ongoing'
  );

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

  // Add this function to handle live audio playback
  const handleLiveAudioPlayback = async () => {
    if (!audioRef.current || !selectedCompany) return;

    try {
      if (isPlayingLiveAudio) {
        audioRef.current.pause();
        setIsPlayingLiveAudio(false);
      } else {
        setIsConnectingAudio(true);
        // Get the latest audio file for the selected company
        console.log('Fetching audio history for company:', selectedCompany.symbol);
        const audioHistory = await fetchAudioHistory(selectedCompany.symbol);
        console.log('Audio history response:', audioHistory);
        
        if (!audioHistory || !Array.isArray(audioHistory) || audioHistory.length === 0) {
          console.error('No audio files available:', audioHistory);
          setIsConnectingAudio(false);
          return;
        }

        // Get the most recent audio file
        const latestAudio = audioHistory[0];
        console.log('Latest audio file:', latestAudio);
        
        if (!latestAudio.audioAvailable) {
          console.error('Audio file not available');
          setIsConnectingAudio(false);
          return;
        }
        
        if (!latestAudio.audioUrl) {
          console.error('Audio URL not found in response');
          setIsConnectingAudio(false);
          return;
        }
        
        // Format the URL properly - audioUrl is already in the correct format from the backend
        const audioUrl = `http://localhost:8000${latestAudio.audioUrl}`;
        console.log('Playing audio from:', audioUrl);
        
        // Set the source and play
        audioRef.current.src = audioUrl;
        await audioRef.current.load(); // Load the audio first
        await audioRef.current.play();
        setIsPlayingLiveAudio(true);
        setIsConnectingAudio(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingLiveAudio(false);
      setIsConnectingAudio(false);
    }
  };

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className={`min-h-screen relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        {/* Main dot pattern */}
        <div className={`absolute inset-0 ${
          isDarkMode 
            ? 'bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-[size:24px_24px]' 
            : 'bg-[radial-gradient(#00000022_1px,transparent_1px)] bg-[size:24px_24px]'
        }`} />
        {/* Secondary smaller dot pattern for depth */}
        <div className={`absolute inset-0 ${
          isDarkMode 
            ? 'bg-[radial-gradient(#ffffff11_1px,transparent_1px)] bg-[size:16px_16px]' 
            : 'bg-[radial-gradient(#00000011_1px,transparent_1px)] bg-[size:16px_16px]'
        }`} />
        {/* Gradient overlay */}
        <div className={`absolute inset-0 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20' 
            : 'bg-gradient-to-br from-indigo-100/50 via-transparent to-purple-100/50'
        }`} />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <MainHeader 
          isMarketOpen={isMarketOpen}
          nextMarketOpen={nextMarketOpen}
        />
        <div className="flex">
          <Sidebar 
            selectedCompany={selectedCompany}
            calls={earningsData}
            onSelectCompany={onSelectCompany}
            isLoading={isLoadingEarnings}
            stockData={sidebarStockData}
          />
          <main className={`flex-1 min-h-screen shadow-inner ${
            isDarkMode 
              ? 'bg-gray-800/95 shadow-2xl shadow-gray-900/50 shadow-inner-xl' 
              : 'bg-gray-50/95'
          }`}>
            <div className={`container mx-auto px-4 py-8 ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              <div className="mb-8">
                <CompanyHeader 
                  company={selectedCompany?.name || ''}
                  currentPrice={stockData?.price ?? null}
                  priceChange={stockData?.change ?? null}
                  priceChangePercent={stockData?.percentChange ?? null}
                  lastUpdate={stockData?.lastUpdate ?? Math.floor(Date.now() / 1000)}
                  isLoading={isLoadingStockPrice}
                />
              </div>
              {selectedCompany ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Transcript Section */}
                    <div className={`p-6 rounded-xl ${
                      isDarkMode 
                        ? 'bg-gray-800/50 shadow-xl shadow-gray-900/50' 
                        : 'bg-white/90 shadow-xl shadow-gray-200/50'
                    } backdrop-blur-sm relative overflow-hidden h-[500px]`}>
                      <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${
                        isDarkMode 
                          ? 'from-indigo-500/10 via-transparent to-purple-500/10' 
                          : 'from-indigo-200/50 via-transparent to-purple-200/50'
                      }`} />
                      
                      {/* Content */}
                      <div className="relative z-10 h-full flex flex-col">
                        {/* Header Section */}
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                          <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <h3 className={`text-xl font-semibold ${
                                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                }`}>
                                  Call Transcription
                                </h3>
                                {isCallOngoing && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                                    isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                                  }`}>
                                    <Radio className="w-3 h-3 text-red-500 animate-pulse mr-1" />
                                    <span className={
                                      isDarkMode ? 'text-red-400' : 'text-red-600'
                                    }>LIVE</span>
                                  </span>
                                )}
                              </div>
                              {isCallOngoing && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleLiveAudioPlayback}
                                    className={`text-sm px-3 py-1.5 rounded-full transition-all duration-200 flex items-center ${
                                      isPlayingLiveAudio
                                        ? (isDarkMode 
                                            ? 'bg-red-500/20 text-red-300 shadow-inner shadow-red-900/20' 
                                            : 'bg-red-100 text-red-700 shadow-inner shadow-red-100')
                                        : (isDarkMode
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:shadow-lg hover:shadow-gray-900/20'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-lg hover:shadow-gray-200/50')
                                    }`}
                                  >
                                    {isPlayingLiveAudio ? (
                                      <>
                                        <Pause className="w-4 h-4 mr-1" />
                                        Stop Listening
                                      </>
                                    ) : isConnectingAudio ? (
                                      <>
                                        <Radio className="w-4 h-4 mr-1 animate-spin" />
                                        Connecting...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-4 h-4 mr-1" />
                                        Listen Live
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setIsLiveCaptionOn(!isLiveCaptionOn)}
                                    className={`text-sm px-3 py-1.5 rounded-full transition-all duration-200 flex items-center ${
                                      isLiveCaptionOn
                                        ? (isDarkMode
                                            ? 'bg-green-500/20 text-green-300 shadow-inner shadow-green-900/20'
                                            : 'bg-green-100 text-green-700 shadow-inner shadow-green-100')
                                        : (isDarkMode
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:shadow-lg hover:shadow-gray-900/20'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-lg hover:shadow-gray-200/50')
                                    }`}
                                  >
                                    {isLiveCaptionOn 
                                      ? <ToggleRight className="w-4 h-4 mr-1 text-green-500" />
                                      : <ToggleLeft className="w-4 h-4 mr-1" />
                                    }
                                    Live Caption
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-end space-x-4">
                              <button
                                onClick={() => setShowAudioHistory(true)}
                                className={`text-sm hover:underline transition-colors duration-200 flex items-center ${
                                  isDarkMode 
                                    ? 'text-indigo-400 hover:text-indigo-300' 
                                    : 'text-indigo-600 hover:text-indigo-700'
                                }`}
                              >
                                <Headphones className="w-4 h-4 mr-1" />
                                Listen Past Calls
                              </button>
                              <div className={`h-4 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                              <button
                                onClick={() => setShowFullTranscript(true)}
                                className={`text-sm hover:underline transition-colors duration-200 flex items-center ${
                                  isDarkMode 
                                    ? 'text-indigo-400 hover:text-indigo-300' 
                                    : 'text-indigo-600 hover:text-indigo-700'
                                }`}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Full Transcription
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className={`flex-1 space-y-4 overflow-y-auto custom-scrollbar rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-800/30 border-gray-700' 
                            : 'bg-gray-50/80 border-gray-200'
                        } p-2`}>
                          {isCallOngoing && isLiveCaptionOn ? (
                            <div className="animate-pulse flex flex-col items-center justify-center h-[120px] gap-3">
                              <Radio className="w-8 h-8 text-red-500" />
                              <span className={`text-lg font-medium ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Listening for live captions...
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                Transcription will appear here in real-time
                              </span>
                            </div>
                          ) : selectedTranscript?.transcript?.slice(0, 3).map((item: any, index: number) => (
                            <div 
                              key={index} 
                              className={`animate-slide-in p-3 rounded-lg ${
                                isDarkMode 
                                  ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                                  : 'bg-white hover:bg-white/80'
                              } shadow-sm transition-all duration-200`}
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <p className={`font-medium flex items-center gap-2 ${
                                isDarkMode ? 'text-gray-200' : 'text-gray-900'
                              }`}>
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'
                                }`} />
                                {item.name}
                              </p>
                              <p className={`mt-2 leading-relaxed ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {item.speech}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div className={`p-6 rounded-xl ${
                      isDarkMode 
                        ? 'bg-gray-800/50 shadow-xl shadow-gray-900/50' 
                        : 'bg-white/90 shadow-xl shadow-gray-200/50'
                    } backdrop-blur-sm relative overflow-hidden h-[500px]`}>
                      <CallSummaryPanel
                        call={{
                          company: selectedCompany.name,
                          symbol: selectedCompany.symbol,
                          date: selectedTranscript?.date || '',
                          time: selectedTranscript?.time || '',
                          status: selectedCompany.status,
                          actualEPS: selectedTranscript?.summary?.financialPerformance?.eps?.actual,
                          expectedEPS: selectedTranscript?.summary?.financialPerformance?.eps?.expected,
                          revenue: selectedTranscript?.summary?.financialPerformance?.revenue,
                          keyHighlights: selectedTranscript?.summary?.keyHighlights,
                          guidance: {
                            revenue: selectedTranscript?.summary?.guidance?.revenue,
                            eps: selectedTranscript?.summary?.guidance?.eps
                          },
                          marketImpact: {
                            priceChange: stockData?.percentChange || 0,
                            volumeChange: stockData?.volumeChange || 0
                          },
                          sentiment: selectedTranscript?.summary?.sentiment
                        }}
                        onViewFullSummary={() => setShowFullSummary(true)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <h2 className={`text-2xl font-semibold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Select a company from the sidebar to view analysis
                  </h2>
                </div>
              )}

              <div className={`mt-8 rounded-xl p-6 ${
                isDarkMode 
                  ? 'bg-gray-800/50 shadow-xl shadow-gray-900/50' 
                  : 'bg-white/90 shadow-xl shadow-gray-200/50'
              } relative overflow-hidden backdrop-blur-sm`}>
                {/* Content */}
                <div className="relative z-10">
                  <AnalysisTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                  <div className="mt-6">
                    {renderAnalysisContent()}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      {showAudioHistory && (
        <AudioHistoryModal
          audioHistory={audioHistory}
          onClose={() => setShowAudioHistory(false)}
        />
      )}

      {showFullTranscript && selectedTranscript && (
        <TranscriptModal
          transcripts={transcripts}
          currentTranscript={selectedTranscript}
          onTranscriptSelect={setSelectedTranscript}
          onClose={() => setShowFullTranscript(false)}
        />
      )}

      {showFullSummary && selectedTranscript && (
        <SummaryModal
          onClose={() => setShowFullSummary(false)}
        />
      )}

      {/* Add audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlayingLiveAudio(false)}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsPlayingLiveAudio(false);
        }}
      />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;