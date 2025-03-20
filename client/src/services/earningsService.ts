const API_BASE_URL = import.meta.env.PROD 
  ? 'https://backend-production-2463.up.railway.app'
  : '';

export const fetchEarningsSchedule = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/earnings-schedule/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching earnings schedule:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch earnings schedule');
  }
}; 