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
    return await apiClient.post('/stock-taking/sessions', data);
  },

  // Get all sessions
  getSessions: async (status?: StockTakeStatus): Promise<StockTakeSession[]> => {
    const params = status ? { status } : {};
    return await apiClient.get('/stock-taking/sessions', params);
  },

  // Get a single session with details
  getSession: async (id: string): Promise<StockTakeSession> => {
    return await apiClient.get(`/stock-taking/sessions/${id}`);
  },

  // Update session
  updateSession: async (id: string, data: UpdateSessionDto): Promise<StockTakeSession> => {
    return await apiClient.patch(`/stock-taking/sessions/${id}`, data);
  },

  // Delete session
  deleteSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/stock-taking/sessions/${id}`);
  },

  // Scan an item
  scanItem: async (sessionId: string, data: ScanItemDto): Promise<ScanResult> => {
    return await apiClient.post(`/stock-taking/sessions/${sessionId}/scan`, data);
  },

  // Complete session
  completeSession: async (id: string): Promise<StockTakeSession> => {
    return await apiClient.patch(`/stock-taking/sessions/${id}/complete`);
  },

  // Approve or reject session
  approveSession: async (id: string, data: ApproveSessionDto): Promise<StockTakeSession> => {
    return await apiClient.patch(`/stock-taking/sessions/${id}/approve`, data);
  },

  // Delete item from session
  deleteItem: async (sessionId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/stock-taking/sessions/${sessionId}/items/${itemId}`);
  },

  // Get session report
  getSessionReport: async (id: string): Promise<any> => {
    return await apiClient.get(`/stock-taking/sessions/${id}/report`);
  },

  // Get variance report (for approval review)
  getVarianceReport: async (id: string): Promise<any> => {
    return await apiClient.get(`/stock-taking/sessions/${id}/variance-report`);
  },
};
