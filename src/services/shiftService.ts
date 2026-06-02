// Shift Service for MCCL POS System
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export type ShiftStatus = 'ACTIVE' | 'CLOSED' | 'ABANDONED' | 'RECONCILED';

export interface Shift {
  id: string;
  shiftNumber: string;
  userId: string;
  tenantId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  openingFloat: number;
  closingFloat?: number;
  declaredCash?: number;
  denominations?: Record<string, number>;
  expectedFloat?: number;
  variance?: number;
  cardExpected?: number;
  cardActual?: number;
  cardVariance?: number;
  cashPayIns?: number;
  cashPayOuts?: number;
  cashRefunds?: number;
  giftCardSales?: number;
  layawayDeposits?: number;
  varianceReason?: string;
  managerOverrideById?: string;
  managerOverrideAt?: string;
  auditResolutionNote?: string;
  auditResolvedById?: string;
  auditResolvedAt?: string;
  status: ShiftStatus;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  openingNotes?: string;
  closingNotes?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    role: string;
  };
  _count?: {
    sales: number;
  };
}

export interface ShiftReport {
  shift: Shift;
  metrics: {
    totalSales: number;
    totalRevenue: number;
    averageSaleValue: number;
    itemsSold: number;
    cancelledSales: number;
    totalDiscount: number;
    totalTax: number;
    paymentBreakdown: Record<string, number>;
    cashSales: number;
    cardSales: number;
    floatVariance: number;
  };
  sales: Array<{
    id: string;
    saleNumber: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
    customers?: {
      firstName: string;
      lastName: string;
    };
    sale_items: Array<{
      quantity: number;
      products: {
        name: string;
        sku: string;
      };
    }>;
  }>;
}

export interface ShiftStatistics {
  totalShifts: number;
  activeShifts: number;
  closedShifts: number;
  averageVariance: number;
  positiveVariances: number;
  negativeVariances: number;
}

export interface StartShiftData {
  openingFloat: number;
  openingNotes?: string;
}

export interface CloseShiftData {
  closingFloat: number; // declared cash counted via the denomination matrix
  denominations?: Record<string, number>;
  cardActual?: number; // PDQ "Z-Read" card total
  giftCardSales?: number;
  layawayDeposits?: number;
  cashRefunds?: number;
  varianceReason?: string;
  managerPin?: string;
  closingNotes?: string;
}

export type ShiftCashMovementType = 'PAY_IN' | 'PAY_OUT';

export interface ShiftCashMovement {
  id: string;
  shiftId: string;
  type: ShiftCashMovementType;
  amount: number;
  reason: string;
  createdAt: string;
}

// Error thrown by closeShift carrying the backend reconciliation code so the
// UI can stage the close (reveal a reason field or a manager-PIN field).
export class CloseShiftError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CloseShiftError';
    this.code = code;
  }
}

export interface ShiftFilters {
  startDate: string;
  endDate: string;
  userId?: string;
  status?: ShiftStatus;
}

class ShiftService {
  /**
   * Start a new shift
   */
  async startShift(data: StartShiftData): Promise<Shift> {
    try {
      const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.SHIFTS}/start`, data);
      return response;
    } catch (error: any) {
      console.error('Error starting shift:', error);
      throw new Error(error.response?.data?.message || 'Failed to start shift');
    }
  }

  /**
   * Get active shift for current user
   */
  async getActiveShift(): Promise<Shift | null> {
    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.SHIFTS}/active`);
      return response;
    } catch (error: any) {
      // Return null if no active shift found (404)
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error getting active shift:', error);
      throw new Error(error.response?.data?.message || 'Failed to get active shift');
    }
  }

  /**
   * Close a shift
   */
  async closeShift(shiftId: string, data: CloseShiftData): Promise<Shift> {
    try {
      const response = await apiClient.patch(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/${shiftId}/close`,
        data
      );
      return response;
    } catch (error: any) {
      console.error('Error closing shift:', error);
      // apiClient rejects with { message, statusCode, error, data } where
      // `data` is the raw response body carrying our reconciliation `code`.
      const body = error.data ?? error.response?.data;
      const code = body?.code;
      const message = body?.message || error.message || 'Failed to close shift';
      throw new CloseShiftError(message, code);
    }
  }

  /**
   * Record a cash movement (pay-in / pay-out) against an active shift
   */
  async createCashMovement(
    shiftId: string,
    data: { type: ShiftCashMovementType; amount: number; reason: string }
  ): Promise<ShiftCashMovement> {
    try {
      return await apiClient.post(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/${shiftId}/cash-movement`,
        data
      );
    } catch (error: any) {
      console.error('Error recording cash movement:', error);
      throw new Error(
        error.data?.message || error.message || 'Failed to record cash movement'
      );
    }
  }

  /**
   * List cash movements for a shift
   */
  async getCashMovements(shiftId: string): Promise<ShiftCashMovement[]> {
    try {
      return await apiClient.get(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/${shiftId}/cash-movements`
      );
    } catch (error: any) {
      console.error('Error getting cash movements:', error);
      return [];
    }
  }

  /**
   * Set or clear a manager's cash-up override PIN (OWNER/MANAGER only)
   */
  async setCashUpPin(
    userId: string,
    pin?: string
  ): Promise<{ success: boolean; hasPin: boolean }> {
    try {
      return await apiClient.patch(`/auth/users/${userId}/cashup-pin`, { pin });
    } catch (error: any) {
      console.error('Error setting cash-up PIN:', error);
      throw new Error(
        error.data?.message || error.message || 'Failed to set PIN'
      );
    }
  }

  /**
   * Get shifts by date range with optional filters
   */
  async getShiftsByDateRange(filters: ShiftFilters): Promise<Shift[]> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', filters.startDate);
      params.append('endDate', filters.endDate);

      if (filters.userId) {
        params.append('userId', filters.userId);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.SHIFTS}?${params.toString()}`
      );
      return response;
    } catch (error: any) {
      console.error('Error getting shifts:', error);
      throw new Error(error.response?.data?.message || 'Failed to get shifts');
    }
  }

  /**
   * Get detailed shift report
   */
  async getShiftReport(shiftId: string): Promise<ShiftReport> {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/${shiftId}/report`
      );
      return response;
    } catch (error: any) {
      console.error('Error getting shift report:', error);
      throw new Error(error.response?.data?.message || 'Failed to get shift report');
    }
  }

  /**
   * Get shift statistics for a date range
   */
  async getShiftStatistics(startDate: string, endDate: string): Promise<ShiftStatistics> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/statistics?${params.toString()}`
      );
      return response;
    } catch (error: any) {
      console.error('Error getting shift statistics:', error);
      throw new Error(error.response?.data?.message || 'Failed to get shift statistics');
    }
  }

  /**
   * Get users who worked in a date range
   */
  async getUsersByDateRange(startDate: string, endDate: string): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/users-by-date?${params.toString()}`
      );
      return response;
    } catch (error: any) {
      console.error('Error getting users by date range:', error);
      throw new Error(error.response?.data?.message || 'Failed to get users by date range');
    }
  }

  /**
   * Get tills used in a date range
   */
  async getTillsByDateRange(startDate: string, endDate: string): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.SHIFTS}/tills-by-date?${params.toString()}`
      );
      return response;
    } catch (error: any) {
      console.error('Error getting tills by date range:', error);
      throw new Error(error.response?.data?.message || 'Failed to get tills by date range');
    }
  }
}

export const shiftService = new ShiftService();
