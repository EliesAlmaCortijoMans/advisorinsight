import { EarningsCall, ThingToListenFor } from '../types';

export const mockCalls: EarningsCall[] = [
  {
    company: 'Apple Inc.',
    symbol: 'AAPL',
    date: '2024-03-20',
    time: '16:30',
    status: 'upcoming',
    expectedEPS: 2.10
  },
  {
    company: 'Tesla Inc.',
    symbol: 'TSLA',
    date: '2024-03-20',
    time: '15:00',
    status: 'upcoming',
    expectedEPS: 0.75
  },
  {
    company: 'Walmart Inc.',
    symbol: 'WMT',
    date: '2024-03-20',
    time: '13:45',
    status: 'ongoing',
    expectedEPS: 1.65
  },
  {
    company: 'International Business Machines Corporation',
    symbol: 'IBM',
    date: '2024-03-20',
    time: '14:15',
    status: 'ongoing',
    expectedEPS: 3.25
  },
  {
    company: 'GameStop Corp.',
    symbol: 'GME',
    date: '2024-03-20',
    time: '13:30',
    status: 'ongoing',
    expectedEPS: -0.15
  },
  {
    company: 'NVIDIA Corporation',
    symbol: 'NVDA',
    date: '2024-03-19',
    time: '10:00',
    status: 'past',
    expectedEPS: 2.85,
    actualEPS: 3.15,    
  },
  {
    company: 'Microsoft Corporation',
    symbol: 'MSFT',
    date: '2024-03-21',
    time: '16:00',
    status: 'upcoming',
    expectedEPS: 2.65
  }
];

export const thingsToListenFor: ThingToListenFor[] = [
  {
    topic: 'AI Revenue Growth',
    context: 'Expected to discuss datacenter AI adoption rates and revenue impact',
    importance: 'high',
    mentioned: false
  },
  {
    topic: 'Supply Chain Updates',
    context: 'Previous quarter noted constraints in Asia',
    importance: 'medium',
    mentioned: true
  },
  {
    topic: 'New Product Pipeline',
    context: 'Rumored launch of next-gen products in Q2',
    importance: 'high',
    mentioned: false
  },
  {
    topic: 'Operating Margin',
    context: 'Target of 30% by year end',
    importance: 'medium',
    mentioned: true
  },
  {
    topic: 'International Expansion',
    context: 'Focus on EMEA market growth',
    importance: 'low',
    mentioned: false
  }
];

export const transcriptContent = {
  openingRemarks: {
    speaker: 'CEO John Smith',
    content: 'Good morning everyone, and thank you for joining us today. I\'m pleased to report another strong quarter for Innovation Labs, with revenue growth exceeding our expectations and significant progress across all our key initiatives...'
  },
  financialOverview: {
    speaker: 'CFO Sarah Johnson',
    content: 'Our Q4 revenue reached $89.5 billion, representing an 8% year-over-year increase. Operating margin improved to 28.5%, up 250 basis points from the previous quarter...'
  },
  qaSession: [
    {
      question: {
        analyst: 'Morgan Stanley',
        content: 'Can you provide more color on the expansion plans in the APAC region?'
      },
      answer: {
        speaker: 'CEO',
        content: 'Certainly. We\'re seeing tremendous opportunity in the APAC market...'
      }
    },
    {
      question: {
        analyst: 'Goldman Sachs',
        content: 'How are you thinking about AI integration in your product roadmap?'
      },
      answer: {
        speaker: 'CTO',
        content: 'AI remains a core focus for us...'
      }
    }
  ]
};

export const summaryContent = {
  keyHighlights: [
    'Revenue growth of 8% year-over-year, exceeding analyst expectations',
    'Operating margin improvement to 28.5%',
    'Announced expansion plans in APAC region',
    'New product line launch scheduled for Q2'
  ],
  financialPerformance: {
    revenue: {
      value: '89.5B',
      change: '8% YoY'
    },
    eps: {
      value: '2.45',
      change: '15% vs Expected'
    }
  },
  strategicInitiatives: [
    'APAC market expansion planned for Q2',
    'Strategic acquisition of TechStart ($500M)',
    'Cost reduction initiative targeting $2B by 2024'
  ]
};

export interface CallAudioHistory {
  id: string;
  company: string;
  symbol: string;
  date: string;
  duration: string;
  audioUrl: string;
  quarter: string;
  year: string;
}

export const audioHistory: CallAudioHistory[] = [
  {
    id: '1',
    company: 'Innovation Labs',
    symbol: 'INNV',
    date: '2024-03-15',
    duration: '45:30',
    audioUrl: '/data/audio/INNV_Q4_2023.wav',
    quarter: 'Q4',
    year: '2023'
  },
  {
    id: '2',
    company: 'Innovation Labs',
    symbol: 'INNV',
    date: '2023-12-15',
    duration: '42:15',
    audioUrl: '/data/audio/INNV_Q3_2023.wav',
    quarter: 'Q3',
    year: '2023'
  },
  {
    id: '3',
    company: 'Innovation Labs',
    symbol: 'INNV',
    date: '2023-09-15',
    duration: '48:20',
    audioUrl: '/data/audio/INNV_Q2_2023.wav',
    quarter: 'Q2',
    year: '2023'
  }
];

export const sentimentData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  sentiment: 0.5 + Math.random() * 0.3 // Random sentiment between 0.5 and 0.8
})); 