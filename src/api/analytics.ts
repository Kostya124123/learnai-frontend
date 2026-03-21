import { apiClient } from './client';
import type { AnalyticsData } from '../types';

export const analyticsApi = {
  getDashboard: async (): Promise<AnalyticsData> => {
    const { data } = await apiClient.get<AnalyticsData>('/analytics/dashboard');
    return data;
  },
};
