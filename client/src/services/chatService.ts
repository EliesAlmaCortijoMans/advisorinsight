import axios from 'axios';

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const chatService = {
  async sendMessage(message: string, symbol: string): Promise<string> {
    try {
      const response = await axios.post('/api/stock/chat/', {
        message,
        symbol
      });
      return response.data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async getSuggestedQuestions(symbol: string): Promise<string[]> {
    try {
      const response = await axios.get(`/api/stock/suggested-questions/?symbol=${symbol}`);
      return response.data.questions;
    } catch (error) {
      console.error('Error fetching suggested questions:', error);
      return [];
    }
  }
}; 