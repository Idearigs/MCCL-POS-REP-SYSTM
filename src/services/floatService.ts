import { apiClient } from './apiClient';

export enum FloatStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  BALANCED = 'BALANCED',
  DISCREPANCY = 'DISCREPANCY',
}

export enum FloatTransactionType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  SALE = 'SALE',
  REFUND = 'REFUND',
  EXPENSE = 'EXPENSE',
}

export interface FloatSession {
  id: string;
  tenantId: string;
  userId: string;
  floatNumber: string;
  registerName?: string;
  openingBalance: number;
  expectedClosing?: number;
  actualClosing?: number;
  difference?: number;
  totalSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalRefunds: number;
  status: FloatStatus;
  notes?: string;
  closingNotes?: string;
  openedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  transactions?: FloatTransaction[];
}

export interface FloatTransaction {
  id: string;
  sessionId: string;
  tenantId: string;
  userId: string;
  type: FloatTransactionType;
  amount: number;
  reason: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface OpenFloatSessionDto {
  registerName?: string;
  openingBalance: number;
  notes?: string;
}

export interface CloseFloatSessionDto {
  actualClosing: number;
  closingNotes?: string;
  denominationBreakdown?: Record<string, number>;
}

export interface CreateFloatTransactionDto {
  sessionId: string;
  type: FloatTransactionType;
  amount: number;
  reason: string;
  reference?: string;
  notes?: string;
}

export interface GetFloatSessionsParams {
  page?: number;
  limit?: number;
  status?: FloatStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface FloatSessionsResponse {
  data: FloatSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class FloatService {
  private baseUrl = '/float';

  /**
   * Open a new float session
   */
  async openFloatSession(data: OpenFloatSessionDto): Promise<FloatSession> {
    return apiClient.post(`${this.baseUrl}/open`, data);
  }

  /**
   * Close a float session
   */
  async closeFloatSession(
    sessionId: string,
    data: CloseFloatSessionDto
  ): Promise<FloatSession> {
    return apiClient.post(`${this.baseUrl}/${sessionId}/close`, data);
  }

  /**
   * Get current open float session
   */
  async getCurrentFloatSession(): Promise<FloatSession | null> {
    return apiClient.get(`${this.baseUrl}/current`);
  }

  /**
   * Get float sessions with filters
   */
  async getFloatSessions(
    params?: GetFloatSessionsParams
  ): Promise<FloatSessionsResponse> {
    return apiClient.get(this.baseUrl, params);
  }

  /**
   * Get float session by ID
   */
  async getFloatSessionById(sessionId: string): Promise<FloatSession> {
    return apiClient.get(`${this.baseUrl}/${sessionId}`);
  }

  /**
   * Create a float transaction (cash in/out)
   */
  async createFloatTransaction(
    data: CreateFloatTransactionDto
  ): Promise<FloatTransaction> {
    return apiClient.post(`${this.baseUrl}/transactions`, data);
  }
}

export const floatService = new FloatService();
export default floatService;
