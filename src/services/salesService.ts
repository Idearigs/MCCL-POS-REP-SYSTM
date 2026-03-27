// Sales Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes?: string;
  receiptNumber: string;
  cashierId: string;
  cashierName: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleData {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    discountPercentage?: number;
    taxRate?: number;
    notes?: string;
  }>;
  payments: Array<{
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'DIGITAL_WALLET' | 'INSTALLMENT';
    amount: number;
    reference?: string;
    cardLast4?: string;
    processorResponse?: string;
    notes?: string;
  }>;
  discountAmount?: number;
  discountPercentage?: number;
  taxRate?: number;
  notes?: string;
  expectedDeliveryDate?: string;
  walkInCustomerName?: string;
  walkInCustomerPhone?: string;
}

export interface SaleFilters {
  search?: string;
  customerId?: string;
  cashierId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  dateFrom?: string;  // Deprecated: use startDate
  dateTo?: string;    // Deprecated: use endDate
  startDate?: string; // Backend-compatible date filter
  endDate?: string;   // Backend-compatible date filter
  minAmount?: number;
  maxAmount?: number;
}

export interface SalesStats {
  totalSales: number;
  completedSales: number;
  pendingSales: number;
  cancelledSales: number;
  totalSalesAmount: number; // Fixed: Match backend property name
  totalRevenue?: number; // Deprecated: for backwards compatibility
  averageSaleAmount: number;
  averageOrderValue?: number; // Deprecated: for backwards compatibility
  totalRefundedAmount: number;
  salesToday: number;
  salesThisMonth: number;
  salesThisYear: number;
  revenueToday: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  paymentMethodBreakdown: Record<string, number>;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  topProducts?: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>; // Deprecated: for backwards compatibility
  salesByHour: Record<string, number>;
  salesByPaymentMethod?: Array<{
    method: string;
    count: number;
    amount: number;
  }>; // Deprecated: for backwards compatibility
}

export interface DailyReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  paymentBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  topProducts: Array<{
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    revenue: number;
  }>;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  dailyBreakdown: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    sales: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export interface RefundData {
  reason: string;
  amount?: number;
  items?: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface Receipt {
  saleId: string;
  receiptNumber: string;
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  customerInfo?: {
    name: string;
    phone: string;
    email: string;
  };
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  date: string;
  cashier: string;
}

class SalesService {
  async getSales(
    page: number = 1,
    limit: number = 10,
    filters: SaleFilters = {}
  ): Promise<PaginatedResponse<Sale>> {
    try {
      const params = {
        page,
        limit,
        ...filters,
      };

      return await apiClient.get<PaginatedResponse<Sale>>(API_CONFIG.ENDPOINTS.SALES, params);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      throw error;
    }
  }

  async getSaleById(id: string): Promise<Sale> {
    try {
      return await apiClient.get<Sale>(`${API_CONFIG.ENDPOINTS.SALES}/${id}`);
    } catch (error) {
      console.error(`Failed to fetch sale ${id}:`, error);
      throw error;
    }
  }

  async getTodaysSales(): Promise<Sale[]> {
    try {
      return await apiClient.get<Sale[]>(API_CONFIG.ENDPOINTS.SALES_TODAY);
    } catch (error) {
      console.error('Failed to fetch today\'s sales:', error);
      throw error;
    }
  }

  async createSale(saleData: CreateSaleData): Promise<Sale> {
    try {
      return await apiClient.post<Sale>(API_CONFIG.ENDPOINTS.CREATE_SALE, saleData);
    } catch (error) {
      console.error('Failed to create sale:', error);
      throw error;
    }
  }

  async refundSale(saleId: string, refundData: RefundData): Promise<Sale> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.REFUND_SALE, {
        id: saleId,
      });
      return await apiClient.post<Sale>(endpoint, refundData);
    } catch (error) {
      console.error(`Failed to refund sale ${saleId}:`, error);
      throw error;
    }
  }


  async voidSale(saleId: string, _reason: string, _details: string): Promise<Sale> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.DELETE_SALE, {
        id: saleId,
      });
      return await apiClient.delete<Sale>(endpoint);
    } catch (error) {
      console.error(`Failed to void sale ${saleId}:`, error);
      throw error;
    }
  }
  async getSalesStats(): Promise<SalesStats> {
    try {
      return await apiClient.get<SalesStats>(API_CONFIG.ENDPOINTS.SALES_STATS);
    } catch (error) {
      console.error('Failed to fetch sales stats:', error);
      throw error;
    }
  }

  async getDailyReport(date?: string): Promise<DailyReport> {
    try {
      const params = date ? { date } : {};
      return await apiClient.get<DailyReport>(API_CONFIG.ENDPOINTS.DAILY_REPORT, params);
    } catch (error) {
      console.error('Failed to fetch daily report:', error);
      throw error;
    }
  }

  async getMonthlyReport(month?: number, year?: number): Promise<MonthlyReport> {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;
      
      return await apiClient.get<MonthlyReport>(API_CONFIG.ENDPOINTS.MONTHLY_REPORT, params);
    } catch (error) {
      console.error('Failed to fetch monthly report:', error);
      throw error;
    }
  }

  async getReceipt(saleId: string): Promise<Receipt> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.SALE_RECEIPT, {
        id: saleId,
      });
      return await apiClient.get<Receipt>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch receipt for sale ${saleId}:`, error);
      throw error;
    }
  }

  async printReceipt(saleId: string): Promise<Blob> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.SALE_RECEIPT, {
        id: saleId,
      });
      
      const response = await apiClient.client.get(`${endpoint}/print`, {
        responseType: 'blob',
      });
      
      return response.data;
    } catch (error) {
      console.error(`Failed to print receipt for sale ${saleId}:`, error);
      throw error;
    }
  }

  async searchSales(query: string, limit: number = 20): Promise<Sale[]> {
    try {
      const response = await this.getSales(1, limit, { search: query });
      return response.data;
    } catch (error) {
      console.error('Failed to search sales:', error);
      throw error;
    }
  }

  // Utility methods for sale calculations
  calculateItemTotal(item: SaleItem): number {
    return (item.unitPrice * item.quantity) - item.discount;
  }

  calculateSubtotal(items: SaleItem[]): number {
    return items.reduce((total, item) => total + this.calculateItemTotal(item), 0);
  }

  calculateTax(subtotal: number, taxRate: number = 0.08): number {
    return subtotal * taxRate;
  }

  calculateTotal(subtotal: number, taxAmount: number, discountAmount: number = 0): number {
    return subtotal + taxAmount - discountAmount;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  generateReceiptNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `RCP-${timestamp.slice(-8)}-${random}`;
  }

  validateSaleData(saleData: CreateSaleData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!saleData.items || saleData.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (!saleData.paymentMethod) {
      errors.push('Payment method is required');
    }

    saleData.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Item ${index + 1}: Valid unit price is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async updateSaleItemNotes(itemId: string, notes: string): Promise<void> {
    await apiClient.patch(`${API_CONFIG.ENDPOINTS.SALES}/items/${itemId}`, { notes });
  }
}

export const salesService = new SalesService();
export default salesService;