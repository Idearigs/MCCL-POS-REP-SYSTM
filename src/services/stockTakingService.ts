import { apiClient } from './apiClient';
import {
  StockTakeSession,
  CreateSessionDto,
  ScanItemDto,
  UpdateSessionDto,
  ApproveSessionDto,
  ScanResult,
  StockTakeStatus,
} from '../types/stock-taking';

export const stockTakingService = {
  // Create a new stock take session
  createSession: async (data: CreateSessionDto): Promise<StockTakeSession> => {
    const response = await apiClient.post('/stock-taking/sessions', data);
    console.log('API Response:', response);
    console.log('Response data:', response.data);
    return response.data;
  },

  // Get all sessions
  getSessions: async (status?: StockTakeStatus): Promise<StockTakeSession[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/stock-taking/sessions', { params });
    return response.data;
  },

  // Get a single session with details
  getSession: async (id: string): Promise<StockTakeSession> => {
    const response = await apiClient.get(`/stock-taking/sessions/${id}`);
    return response.data;
  },

  // Update session
  updateSession: async (id: string, data: UpdateSessionDto): Promise<StockTakeSession> => {
    const response = await apiClient.patch(`/stock-taking/sessions/${id}`, data);
    return response.data;
  },

  // Delete session
  deleteSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/stock-taking/sessions/${id}`);
  },

  // Scan an item
  scanItem: async (sessionId: string, data: ScanItemDto): Promise<ScanResult> => {
    const response = await apiClient.post(`/stock-taking/sessions/${sessionId}/scan`, data);
    return response.data;
  },

  // Complete session
  completeSession: async (id: string): Promise<StockTakeSession> => {
    const response = await apiClient.patch(`/stock-taking/sessions/${id}/complete`);
    return response.data;
  },

  // Approve or reject session
  approveSession: async (id: string, data: ApproveSessionDto): Promise<StockTakeSession> => {
    const response = await apiClient.patch(`/stock-taking/sessions/${id}/approve`, data);
    return response.data;
  },

  // Delete item from session
  deleteItem: async (sessionId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/stock-taking/sessions/${sessionId}/items/${itemId}`);
  },

  // Get session report
  getSessionReport: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/stock-taking/sessions/${id}/report`);
    return response.data;
  },
};
