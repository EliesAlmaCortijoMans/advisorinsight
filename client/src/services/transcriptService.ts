// Cache for transcripts
const transcriptCache = new Map<string, any[]>();

export const prefetchAllTranscripts = async (symbols: string[]) => {
  try {
    await Promise.all(
      symbols.map(async (symbol) => {
        const transcripts = await fetchCompanyTranscripts(symbol);
        transcriptCache.set(symbol, transcripts);
      })
    );
    console.log('Successfully prefetched all transcripts');
  } catch (error) {
    console.error('Error prefetching transcripts:', error);
  }
};

export const fetchCompanyTranscripts = async (symbol: string) => {
  try {
    // Check cache first
    if (transcriptCache.has(symbol)) {
      console.log('Using cached transcripts for:', symbol);
      return transcriptCache.get(symbol);
    }

    console.log('Making request to:', `/api/transcripts/${symbol}/`);
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

    // Cache the transcripts
    transcriptCache.set(symbol, data.transcripts);
    return data.transcripts;
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    throw error;
  }
}; 