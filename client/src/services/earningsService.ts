const API_BASE_URL = import.meta.env.PROD 
  ? 'https://backend-production-2463.up.railway.app'
  : '';

interface EarningsResponse {
  success: boolean;
  earnings: Array<{
    company: string;
    symbol: string;
    date: string;
    time: string;
    status: 'past' | 'ongoing' | 'upcoming';
    expectedEPS: number | null;
    actualEPS?: number | null;
  }>;
  timestamp: string;
}

export const fetchEarningsSchedule = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/earnings-schedule/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: EarningsResponse = await response.json();
    if (!data.success) {
      throw new Error('Failed to fetch earnings schedule');
    }
    return data.earnings;
  } catch (error) {
    console.error('Error fetching earnings schedule:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch earnings schedule');
  }
}; 