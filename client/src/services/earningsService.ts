export const fetchEarningsSchedule = async () => {
  try {
    const response = await fetch('/api/earnings-schedule/');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch earnings schedule');
    }
    return data.earnings;
  } catch (error) {
    console.error('Error fetching earnings schedule:', error);
    throw error;
  }
}; 