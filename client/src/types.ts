export interface EarningsCall {
  company: string;
  symbol: string;
  date: string;
  time: string;
  status: 'upcoming' | 'ongoing' | 'past';
  expectedEPS: number;
  actualEPS?: number;
  revenue?: number;
  keyHighlights?: string[];
  guidance?: {
    revenue?: number;
    eps?: number;
  };
  marketImpact?: {
    priceChange: number;
    volumeChange: number;
  };
  sentiment?: string;
}

export interface Company {
  symbol: string;
  name: string;
  status: 'upcoming' | 'ongoing' | 'past';
  latestTranscriptId?: string;
  isOngoing?: boolean;
}

export interface StockData {
  symbol: string;
  price: number | null;
  change: number | null;
  percentChange: number | null;
  volumeChange: number | null;
  isLive: boolean;
  nextMarketOpen: number | null;
  lastUpdate: number;
}

export interface ThingToListenFor {
  topic: string;
  context: string;
  importance: 'high' | 'medium' | 'low';
  mentioned: boolean;
}

export type AnalysisTab = 'sentiment' | 'financial' | 'investor' | 'market-impact' | 'news'; 