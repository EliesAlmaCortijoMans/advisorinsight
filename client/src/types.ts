export interface EarningsCall {
  company: string;
  symbol: string;
  date: string;
  time: string;
  status: 'upcoming' | 'ongoing' | 'past';
  expectedEPS: number;
  actualEPS?: number;
}

export interface ThingToListenFor {
  topic: string;
  context: string;
  importance: 'high' | 'medium' | 'low';
  mentioned: boolean;
}

export type AnalysisTab = 'sentiment' | 'financial' | 'investor' | 'market-impact'; 