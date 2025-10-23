// Cashier/Staff Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'READONLY';

export interface Cashier {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  // Sales statistics
  totalSales?: number;
  totalRevenue?: number;
  salesCount?: number;
}

export interface CreateCashierData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateCashierData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}

export interface CashierStats {
  cashierId: string;
  cashierName: string;
  todaySales: number;
  todayRevenue: number;
  weekSales: number;
  weekRevenue: number;
  monthSales: number;
  monthRevenue: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastSaleDate?: string;
}

class CashierService {
  /**
   * Get all cashiers/staff members
   */
  async getCashiers(
    page: number = 1,
    limit: number = 100,
    filters: { role?: UserRole; isActive?: boolean } = {}
  ): Promise<PaginatedResponse<Cashier>> {
    try {
      const params: any = {
        page,
        limit,
      };

      // Only add filters if they are explicitly provided
      if (filters.role) {
        params.role = filters.role;
      }

      if (filters.isActive !== undefined) {
        params.isActive = filters.isActive;
      }

      // Using auth endpoint to get users
      const response = await apiClient.get<PaginatedResponse<Cashier>>('/auth/users', params);
      return response;
    } catch (error) {
      console.error('Failed to fetch cashiers:', error);
      throw error;
    }
  }

  /**
   * Get a single cashier by ID
   */
  async getCashierById(id: string): Promise<Cashier> {
    try {
      return await apiClient.get<Cashier>(`/auth/users/${id}`);
    } catch (error) {
      console.error(`Failed to fetch cashier ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new cashier
   */
  async createCashier(cashierData: CreateCashierData): Promise<Cashier> {
    try {
      const data = {
        ...cashierData,
        role: cashierData.role || 'STAFF',
      };
      return await apiClient.post<Cashier>('/auth/register', data);
    } catch (error) {
      console.error('Failed to create cashier:', error);
      throw error;
    }
  }

  /**
   * Update cashier details
   */
  async updateCashier(id: string, cashierData: UpdateCashierData): Promise<Cashier> {
    try {
      return await apiClient.patch<Cashier>(`/auth/users/${id}`, cashierData);
    } catch (error) {
      console.error(`Failed to update cashier ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete/deactivate a cashier
   */
  async deactivateCashier(id: string): Promise<void> {
    try {
      await apiClient.patch(`/auth/users/${id}`, { isActive: false });
    } catch (error) {
      console.error(`Failed to deactivate cashier ${id}:`, error);
      throw error;
    }
  }

  /**
   * Activate a cashier
   */
  async activateCashier(id: string): Promise<void> {
    try {
      await apiClient.patch(`/auth/users/${id}`, { isActive: true });
    } catch (error) {
      console.error(`Failed to activate cashier ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get cashier statistics
   */
  async getCashierStats(cashierId?: string): Promise<CashierStats[]> {
    try {
      const endpoint = cashierId
        ? `/sales/stats/cashier/${cashierId}`
        : '/sales/stats/cashiers';
      return await apiClient.get<CashierStats[]>(endpoint);
    } catch (error) {
      console.error('Failed to fetch cashier stats:', error);
      throw error;
    }
  }

  /**
   * Get sales made by a specific cashier
   */
  async getCashierSales(cashierId: string, page: number = 1, limit: number = 20) {
    try {
      return await apiClient.get('/sales', {
        page,
        limit,
        cashierId,
      });
    } catch (error) {
      console.error(`Failed to fetch sales for cashier ${cashierId}:`, error);
      throw error;
    }
  }

  /**
   * Reset cashier password
   */
  async resetPassword(cashierId: string, newPassword: string): Promise<void> {
    try {
      await apiClient.patch(`/auth/users/${cashierId}/password`, {
        password: newPassword,
      });
    } catch (error) {
      console.error(`Failed to reset password for cashier ${cashierId}:`, error);
      throw error;
    }
  }

  /**
   * Format cashier name
   */
  formatCashierName(cashier: Cashier): string {
    return `${cashier.firstName} ${cashier.lastName}`.trim();
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }
}

export const cashierService = new CashierService();
export default cashierService;
