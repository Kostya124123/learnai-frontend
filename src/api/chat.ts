import { apiClient } from './client';
import type { ChatMessage } from '../types';

export const chatApi = {
  getHistory: async (): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>('/chat/history');
    return data;
  },

  ask: async (question: string): Promise<{ answer: string; source: string }> => {
    const { data } = await apiClient.post('/ask', { question });
    return data;
  },
};
