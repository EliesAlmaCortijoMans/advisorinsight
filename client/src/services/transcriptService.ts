export const fetchCompanyTranscripts = async (symbol: string) => {
  try {
    console.log('Making request to:', `/api/transcripts/${symbol}/`); // Debug log
    const response = await fetch(`/api/transcripts/${symbol}/`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch transcripts');
    }
    return data.transcripts;
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    throw error;
  }
}; 