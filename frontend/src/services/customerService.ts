// Customer Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  notes?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  first_name?: string;
  last_name?: string;
  date_added?: string;
  total_spent?: number;
  visit_count?: number;
  loyalty_points?: number;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  notes?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  isActive?: boolean;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newCustomersThisMonth: number;
  topCities: Array<{ city: string; count: number }>;
  customersByCountry: Array<{ country: string; count: number }>;
}

export interface SalesHistory {
  id: string;
  date: string;
  totalAmount: number;
  items: number;
  status: string;
}

export interface RepairHistory {
  id: string;
  itemDescription: string;
  status: string;
  dateReceived: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
  cost: number;
}

class CustomerService {
  async getCustomers(
    search?: string,
    page: number = 1,
    limit: number = 10,
    filters: CustomerFilters = {}
  ): Promise<Customer[] | PaginatedResponse<Customer>> {
    try {
      const params = {
        page,
        limit,
        search,
        ...filters,
      };

      const result = await apiClient.get<PaginatedResponse<Customer>>(API_CONFIG.ENDPOINTS.CUSTOMERS, params);
      
      // For backward compatibility, return just the data array if no pagination needed
      if (search && !page) {
        return result.data;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      throw error;
    }
  }

  async getCustomerById(id: string | number): Promise<Customer> {
    try {
      return await apiClient.get<Customer>(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`);
    } catch (error) {
      console.error(`Failed to fetch customer ${id}:`, error);
      throw error;
    }
  }

  async createCustomer(customerData: CreateCustomerData | Omit<Customer, 'id'>): Promise<Customer> {
    try {
      // Handle legacy format
      if ('first_name' in customerData && 'last_name' in customerData) {
        const legacyData = customerData as any;
        const modernData: CreateCustomerData = {
          name: `${legacyData.first_name} ${legacyData.last_name}`,
          email: legacyData.email,
          phone: legacyData.phone,
          address: legacyData.address,
          city: legacyData.city,
          state: legacyData.state,
          zipCode: legacyData.zip_code,
          country: legacyData.country,
          dateOfBirth: legacyData.date_of_birth,
          notes: legacyData.notes,
        };
        return await apiClient.post<Customer>(API_CONFIG.ENDPOINTS.CUSTOMERS, modernData);
      }
      
      return await apiClient.post<Customer>(API_CONFIG.ENDPOINTS.CUSTOMERS, customerData);
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string | number, customerData: UpdateCustomerData | Partial<Customer>): Promise<Customer> {
    try {
      return await apiClient.put<Customer>(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`, customerData);
    } catch (error) {
      console.error(`Failed to update customer ${id}:`, error);
      throw error;
    }
  }

  async deleteCustomer(id: string | number): Promise<boolean> {
    try {
      await apiClient.delete(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete customer ${id}:`, error);
      throw error;
    }
  }

  async getCustomerStats(): Promise<CustomerStats> {
    try {
      return await apiClient.get<CustomerStats>(API_CONFIG.ENDPOINTS.CUSTOMER_STATS);
    } catch (error) {
      console.error('Failed to fetch customer stats:', error);
      throw error;
    }
  }

  async getSalesHistory(customerId: string): Promise<SalesHistory[]> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.CUSTOMER_SALES_HISTORY, {
        id: customerId,
      });
      return await apiClient.get<SalesHistory[]>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch sales history for customer ${customerId}:`, error);
      throw error;
    }
  }

  async getRepairHistory(customerId: string): Promise<RepairHistory[]> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.CUSTOMER_REPAIR_HISTORY, {
        id: customerId,
      });
      return await apiClient.get<RepairHistory[]>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch repair history for customer ${customerId}:`, error);
      throw error;
    }
  }

  async exportCustomerData(customerId: string): Promise<Blob> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.CUSTOMER_GDPR_EXPORT, {
        id: customerId,
      });
      
      const response = await apiClient.client.get(endpoint, {
        responseType: 'blob',
      });
      
      return response.data;
    } catch (error) {
      console.error(`Failed to export data for customer ${customerId}:`, error);
      throw error;
    }
  }

  async deleteCustomerData(customerId: string): Promise<void> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.CUSTOMER_GDPR_DELETE, {
        id: customerId,
      });
      await apiClient.delete(endpoint);
    } catch (error) {
      console.error(`Failed to delete data for customer ${customerId}:`, error);
      throw error;
    }
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const result = await this.getCustomers(query);
      return Array.isArray(result) ? result : result.data;
    } catch (error) {
      console.error('Failed to search customers:', error);
      throw error;
    }
  }
}

export const customerService = new CustomerService();
