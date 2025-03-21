export const fetchAudioHistory = async (symbol: string) => {
  try {
    console.log('Fetching audio history for:', symbol);
    const response = await fetch(`/api/audio-history/${symbol}/`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch audio history');
    }

    return data.audioHistory;
  } catch (error) {
    console.error('Error fetching audio history:', error);
    throw error;
  }
}; 