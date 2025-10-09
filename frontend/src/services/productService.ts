// Product Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  material: string;
  weight?: number;
  dimensions?: string;
  price: number;
  cost: number;
  stock: number;
  minStockLevel: number;
  isActive: boolean;
  images?: string[];
  tags?: string[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  material: string;
  weight?: number;
  dimensions?: string;
  price: number;
  cost: number;
  stock: number;
  minStockLevel?: number;
  images?: string[];
  tags?: string[];
}

export interface UpdateProductData extends Partial<CreateProductData> {
  isActive?: boolean;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  material?: string;
  isActive?: boolean;
  lowStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  totalValue: number;
  averagePrice: number;
  topCategories: Array<{ category: string; count: number; value: number }>;
  topMaterials: Array<{ material: string; count: number; value: number }>;
}

export interface StockAdjustment {
  quantity: number;
  reason: string;
  notes?: string;
}

export interface BulkStockUpdate {
  productId: string;
  newStock: number;
  reason: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  category: string;
  price: number;
}

class ProductService {
  async getProducts(
    page: number = 1,
    limit: number = 10,
    filters: ProductFilters = {}
  ): Promise<PaginatedResponse<Product>> {
    try {
      const params = {
        page,
        limit,
        ...filters,
      };

      return await apiClient.get<PaginatedResponse<Product>>(API_CONFIG.ENDPOINTS.PRODUCTS, params);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product> {
    try {
      return await apiClient.get<Product>(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      throw error;
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.PRODUCT_BY_BARCODE, {
        barcode,
      });
      return await apiClient.get<Product>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch product by barcode ${barcode}:`, error);
      throw error;
    }
  }

  async getProductBySku(sku: string): Promise<Product> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.PRODUCT_BY_SKU, {
        sku,
      });
      return await apiClient.get<Product>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch product by SKU ${sku}:`, error);
      throw error;
    }
  }

  async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      return await apiClient.post<Product>(API_CONFIG.ENDPOINTS.PRODUCTS, productData);
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    try {
      return await apiClient.put<Product>(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`, productData);
    } catch (error) {
      console.error(`Failed to update product ${id}:`, error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await apiClient.delete(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
    } catch (error) {
      console.error(`Failed to delete product ${id}:`, error);
      throw error;
    }
  }

  async getProductStats(): Promise<ProductStats> {
    try {
      return await apiClient.get<ProductStats>(API_CONFIG.ENDPOINTS.PRODUCT_STATS);
    } catch (error) {
      console.error('Failed to fetch product stats:', error);
      throw error;
    }
  }

  async getLowStockReport(): Promise<LowStockProduct[]> {
    try {
      return await apiClient.get<LowStockProduct[]>(API_CONFIG.ENDPOINTS.LOW_STOCK_REPORT);
    } catch (error) {
      console.error('Failed to fetch low stock report:', error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      return await apiClient.get<string[]>(API_CONFIG.ENDPOINTS.PRODUCT_CATEGORIES);
    } catch (error) {
      console.error('Failed to fetch product categories:', error);
      throw error;
    }
  }

  async getMaterials(): Promise<string[]> {
    try {
      return await apiClient.get<string[]>(API_CONFIG.ENDPOINTS.PRODUCT_MATERIALS);
    } catch (error) {
      console.error('Failed to fetch product materials:', error);
      throw error;
    }
  }

  async adjustStock(productId: string, adjustment: StockAdjustment): Promise<Product> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.ADJUST_STOCK, {
        id: productId,
      });
      return await apiClient.post<Product>(endpoint, adjustment);
    } catch (error) {
      console.error(`Failed to adjust stock for product ${productId}:`, error);
      throw error;
    }
  }

  async bulkUpdateStock(updates: BulkStockUpdate[]): Promise<{ updated: number; errors: any[] }> {
    try {
      return await apiClient.post(API_CONFIG.ENDPOINTS.BULK_UPDATE_STOCK, { updates });
    } catch (error) {
      console.error('Failed to bulk update stock:', error);
      throw error;
    }
  }

  async uploadProductImage(productId: string, file: File): Promise<{ imageUrl: string }> {
    try {
      return await apiClient.uploadFile<{ imageUrl: string }>(
        `${API_CONFIG.ENDPOINTS.PRODUCTS}/${productId}/image`,
        file
      );
    } catch (error) {
      console.error(`Failed to upload image for product ${productId}:`, error);
      throw error;
    }
  }

  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    try {
      const response = await this.getProducts(1, limit, { search: query });
      return response.data;
    } catch (error) {
      console.error('Failed to search products:', error);
      throw error;
    }
  }

  // Utility methods for product calculations
  calculateProfitMargin(product: Product): number {
    if (product.cost === 0) return 0;
    return ((product.price - product.cost) / product.price) * 100;
  }

  calculateStockValue(products: Product[]): number {
    return products.reduce((total, product) => total + (product.price * product.stock), 0);
  }

  isLowStock(product: Product): boolean {
    return product.stock <= product.minStockLevel;
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

export const productService = new ProductService();
export default productService;