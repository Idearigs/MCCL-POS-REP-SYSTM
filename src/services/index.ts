// Main Services Export for MPS Jewelry System
export { apiClient, ApiClient } from './apiClient';
export { authService, default as AuthService } from './authService';
export { customerService, default as CustomerService } from './customerService';
export { productService, default as ProductService } from './productService';
export { salesService, default as SalesService } from './salesService';
export { repairService, default as RepairService } from './repairService';

// Export types for easy importing
export type {
  ApiClientConfig,
} from './apiClient';

export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ChangePasswordData,
} from './authService';

export type {
  Customer,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerFilters,
  CustomerStats,
  SalesHistory,
  RepairHistory,
} from './customerService';

export type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  ProductStats,
  StockAdjustment,
  BulkStockUpdate,
  LowStockProduct,
} from './productService';

export type {
  Sale,
  SaleItem,
  CreateSaleData,
  SaleFilters,
  SalesStats,
  DailyReport,
  MonthlyReport,
  RefundData,
  Receipt,
} from './salesService';

export type {
  Repair,
  CreateRepairData,
  UpdateRepairData,
  RepairFilters,
  RepairStats,
  RepairNote,
  RepairTimelineEvent,
  WorkloadReport,
} from './repairService';