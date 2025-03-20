const API_BASE_URL = import.meta.env.PROD 
  ? 'https://backend-production-2463.up.railway.app'
  : '';

// Cache for transcripts
export const transcriptCache = new Map<string, any[]>();

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

    console.log('Making request to:', `${API_BASE_URL}/api/transcripts/${symbol}/`);
    const response = await fetch(`${API_BASE_URL}/api/transcripts/${symbol}/`, {
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

export const fetchEarningsCallSummary = async (symbol: string, callId: string) => {
  try {
    // First get the transcript from the cache or fetch it
    const transcripts = await fetchCompanyTranscripts(symbol);
    const transcript = transcripts.find((t: any) => t.id === callId);
    
    if (!transcript) {
      throw new Error(`Transcript ${callId} not found for ${symbol}`);
    }

    // Now get the summary from the API
    const response = await fetch(`/api/stock/earnings-summary/${symbol}/${callId}/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch earnings call summary');
    }
    return data.summary;
  } catch (error) {
    console.error('Error fetching earnings call summary:', error);
    throw error;
  }
}; 