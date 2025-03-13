import { API_BASE_URL } from '../config';

export interface KeyHighlightsResponse {
  responses: string[];
  message: string;
}

export interface KeyHighlightsError {
  error: string;
}

export const fetchKeyHighlights = async (symbol: string): Promise<KeyHighlightsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/stock/key-highlights/?symbol=${symbol}`);
    const data = await response.json();
    
    if (!response.ok) {
      const error = data as KeyHighlightsError;
      throw new Error(error.error || 'Failed to fetch key highlights');
    }

    return data as KeyHighlightsResponse;
  } catch (error) {
    console.error('Error fetching key highlights:', error);
    throw error;
  }
}; 