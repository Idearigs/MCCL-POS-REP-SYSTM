import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export enum QuickActionType {
  TODAY_SALES = 'TODAY_SALES',
  STOCK_LEVELS = 'STOCK_LEVELS',
  SHIFT_SUMMARY = 'SHIFT_SUMMARY',
  LOW_STOCK = 'LOW_STOCK',
  TOP_PRODUCTS = 'TOP_PRODUCTS',
  RECENT_CUSTOMERS = 'RECENT_CUSTOMERS'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  suggestions?: string[];
  hasReport?: boolean;
  reportData?: any;
  reportType?: string;
  reportPeriod?: string;
}

class ChatbotService {
  private baseUrl = `${API_CONFIG.BASE_URL}/chatbot`;

  /**
   * Send message to chatbot
   */
  async sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/message`, {
        message,
        conversationId,
      });
      return response;
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  /**
   * Execute quick action
   */
  async executeQuickAction(action: QuickActionType, parameters?: Record<string, any>): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/quick-action`, {
        action,
        parameters,
      });
      return response;
    } catch (error: any) {
      console.error('Error executing quick action:', error);
      throw new Error(error.response?.data?.message || 'Failed to execute quick action');
    }
  }

  /**
   * Download PDF report
   */
  async downloadPDF(reportData: any, reportType: string, period?: string): Promise<void> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/export/pdf`, {
        reportData,
        reportType,
        period,
      }, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      throw new Error('Failed to download PDF report');
    }
  }

  /**
   * Download CSV report
   */
  async downloadCSV(reportData: any, reportType: string, period?: string): Promise<void> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/export/csv`, {
        reportData,
        reportType,
        period,
      }, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading CSV:', error);
      throw new Error('Failed to download CSV report');
    }
  }
}

export const chatbotService = new ChatbotService();
