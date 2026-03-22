// Customer Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

export interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string; // For backward compatibility
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string; // Backend uses postalCode, not zipCode
  country?: string;
  birthDate?: string; // Backend uses birthDate, not dateOfBirth
  notes?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  // Marketing consent fields
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingPhone?: boolean;
  dataProcessingConsent?: boolean;
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

// Backend CustomerStats interface - matches backend DTO exactly
export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  redFlaggedCustomers: number;
  newCustomersThisMonth: number;  // Backend field name
  totalSpentAllTime: number;
  averageSpentPerCustomer: number;
  customersWithEmailConsent: number;
  customersWithSmsConsent: number;
  // Legacy/compatibility fields
  newThisMonth?: number;  // Computed from newCustomersThisMonth
  topCities?: Array<{ city: string; count: number }>;
  customersByCountry?: Array<{ country: string; count: number }>;
  topCustomers?: Array<any>;
  customerGrowth?: Array<any>;
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
      // Transform frontend data to match backend DTO
      const transformedData = this.transformToBackendFormat(customerData);
      return await apiClient.post<Customer>(API_CONFIG.ENDPOINTS.CUSTOMERS, transformedData);
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw error;
    }
  }

  private transformToBackendFormat(customerData: any): any {
    const transformed: any = { ...customerData };

    // Handle name splitting - split 'name' into firstName and lastName
    if (transformed.name && !transformed.firstName && !transformed.lastName) {
      const nameParts = transformed.name.trim().split(' ');
      transformed.firstName = nameParts[0] || '';
      transformed.lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
      delete transformed.name; // Remove 'name' field as it's not allowed
    }

    // Handle legacy format
    if (transformed.first_name && transformed.last_name) {
      transformed.firstName = transformed.first_name;
      transformed.lastName = transformed.last_name;
      delete transformed.first_name;
      delete transformed.last_name;
    }

    // Map marketingConsent to individual boolean fields
    if (transformed.marketingConsent) {
      transformed.marketingEmail = !!transformed.marketingConsent.email;
      transformed.marketingSms = !!transformed.marketingConsent.sms;
      transformed.marketingPhone = !!transformed.marketingConsent.phone;
      delete transformed.marketingConsent;
    }

    // Ensure boolean fields are properly set
    transformed.dataProcessingConsent = !!transformed.dataProcessingConsent;
    transformed.marketingEmail = transformed.marketingEmail || false;
    transformed.marketingSms = transformed.marketingSms || false;
    transformed.marketingPhone = transformed.marketingPhone || false;

    // Map other fields
    if (transformed.zipCode) {
      transformed.postalCode = transformed.zipCode;
      delete transformed.zipCode;
    }

    if (transformed.state) {
      // State can be mapped to address or handled separately
      delete transformed.state;
    }

    if (transformed.dateOfBirth) {
      transformed.birthDate = transformed.dateOfBirth;
      delete transformed.dateOfBirth;
    }

    // Remove any undefined or null values
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === undefined || transformed[key] === null) {
        delete transformed[key];
      }
    });

    return transformed;
  }

  async updateCustomer(id: string | number, customerData: UpdateCustomerData | Partial<Customer>): Promise<Customer> {
    try {
      return await apiClient.patch<Customer>(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`, customerData);
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
      const stats = await apiClient.get<CustomerStats>(API_CONFIG.ENDPOINTS.CUSTOMER_STATS);

      // Add compatibility fields for frontend code that uses old field names
      return {
        ...stats,
        newThisMonth: stats.newCustomersThisMonth,
        topCities: [],
        customersByCountry: [],
        topCustomers: [],
        customerGrowth: [],
      };
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
