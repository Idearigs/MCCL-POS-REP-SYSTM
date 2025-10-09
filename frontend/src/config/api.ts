// API Configuration for MPS Jewelry Backend Integration

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1',
  TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
  
  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    CHANGE_PASSWORD: '/auth/change-password',
    
    // Customers
    CUSTOMERS: '/customers',
    CUSTOMER_STATS: '/customers/stats',
    CUSTOMER_GDPR_EXPORT: '/customers/gdpr/export',
    CUSTOMER_GDPR_DELETE: '/customers/gdpr/delete',
    CUSTOMER_SALES_HISTORY: '/customers/{id}/sales-history',
    CUSTOMER_REPAIR_HISTORY: '/customers/{id}/repair-history',
    
    // Products/Inventory
    PRODUCTS: '/products',
    PRODUCT_STATS: '/products/stats',
    LOW_STOCK_REPORT: '/products/low-stock',
    PRODUCT_CATEGORIES: '/products/categories',
    PRODUCT_MATERIALS: '/products/materials',
    ADJUST_STOCK: '/products/{id}/adjust-stock',
    BULK_UPDATE_STOCK: '/products/bulk-update-stock',
    PRODUCT_BY_BARCODE: '/products/barcode/{barcode}',
    PRODUCT_BY_SKU: '/products/sku/{sku}',
    
    // Sales/POS
    SALES: '/sales',
    SALES_STATS: '/sales/stats',
    SALES_TODAY: '/sales/today',
    CREATE_SALE: '/sales',
    REFUND_SALE: '/sales/{id}/refund',
    SALE_RECEIPT: '/sales/{id}/receipt',
    DAILY_REPORT: '/sales/reports/daily',
    MONTHLY_REPORT: '/sales/reports/monthly',
    
    // Repairs
    REPAIRS: '/repairs',
    REPAIR_STATS: '/repairs/stats',
    REPAIR_NOTES: '/repairs/{id}/notes',
    CANCEL_REPAIR: '/repairs/{id}/cancel',
    REPAIR_TIMELINE: '/repairs/{id}/timeline',
    OVERDUE_REPAIRS: '/repairs/overdue',
    ACTIVE_REPAIRS: '/repairs/active',
    WORKLOAD_REPORT: '/repairs/reports/workload',
    
    // Health & System
    HEALTH: '/health',
    API_DOCS: '/api'
  },
  
  // Default request headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Tenant configuration
  TENANT_ID: process.env.REACT_APP_TENANT_ID || 'buymejewellery'
};

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Common API Error Types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  timestamp?: string;
}

export default API_CONFIG;