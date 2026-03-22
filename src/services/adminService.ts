// Admin Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'READONLY';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'READONLY';
}

export interface UpdateAdminData extends Partial<Omit<CreateAdminData, 'password'>> {
  isActive?: boolean;
}

export interface AdminFilters {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface AdminResponse {
  data: Admin[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

class AdminService {
  private readonly endpoint = '/users';

  async getAdmins(filters: AdminFilters = {}): Promise<AdminResponse> {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 10,
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
      };

      return await apiClient.get<AdminResponse>(this.endpoint, params);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      throw error;
    }
  }

  async getAdminById(id: string): Promise<Admin> {
    try {
      return await apiClient.get<Admin>(`${this.endpoint}/${id}`);
    } catch (error) {
      console.error(`Failed to fetch admin ${id}:`, error);
      throw error;
    }
  }

  async createAdmin(adminData: CreateAdminData): Promise<Admin> {
    try {
      return await apiClient.post<Admin>(this.endpoint, adminData);
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  }

  async updateAdmin(id: string, adminData: UpdateAdminData): Promise<Admin> {
    try {
      return await apiClient.patch<Admin>(`${this.endpoint}/${id}`, adminData);
    } catch (error) {
      console.error(`Failed to update admin ${id}:`, error);
      throw error;
    }
  }

  async deleteAdmin(id: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`${this.endpoint}/${id}`);
    } catch (error) {
      console.error(`Failed to delete admin ${id}:`, error);
      throw error;
    }
  }

  async activateAdmin(id: string): Promise<Admin> {
    try {
      return await apiClient.patch<Admin>(`${this.endpoint}/${id}/activate`);
    } catch (error) {
      console.error(`Failed to activate admin ${id}:`, error);
      throw error;
    }
  }

  async deactivateAdmin(id: string): Promise<Admin> {
    try {
      return await apiClient.patch<Admin>(`${this.endpoint}/${id}/deactivate`);
    } catch (error) {
      console.error(`Failed to deactivate admin ${id}:`, error);
      throw error;
    }
  }

  async getAdminStats(): Promise<{
    totalAdmins: number;
    activeAdmins: number;
    inactiveAdmins: number;
    roleDistribution: Record<string, number>;
  }> {
    try {
      return await apiClient.get<any>(`${this.endpoint}/stats/summary`);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;