import { apiClient } from './client';
import type { AuthTokens, User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    const { data } = await apiClient.post<AuthTokens>('/auth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },
};
