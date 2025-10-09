// Product Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

// Backend API response interface (matches backend DTOs)
export interface BackendProduct {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  material?: string;
  weight?: number;
  sellingPrice: number;
  costPrice?: number;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  images?: Array<{ driveViewLink: string; isMain: boolean }>;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

// Frontend UI interface (simplified field names for compatibility)
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

// Backend CreateProductDto interface
export interface BackendCreateProductData {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  material?: string;
  weight?: number;
  sellingPrice: number;
  costPrice?: number;
  stockQuantity: number;
  minStockLevel?: number;
}

// Frontend CreateProductData interface (simplified for UI compatibility)
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

// Transformation functions
const transformBackendToFrontend = (backendProduct: BackendProduct): Product => ({
  id: backendProduct.id,
  name: backendProduct.name,
  description: backendProduct.description,
  sku: backendProduct.sku,
  barcode: backendProduct.barcode,
  category: backendProduct.categoryId || '',
  material: backendProduct.material || '',
  weight: backendProduct.weight,
  dimensions: undefined, // Not available in backend
  price: backendProduct.sellingPrice,
  cost: backendProduct.costPrice || 0,
  stock: backendProduct.stockQuantity,
  minStockLevel: backendProduct.minStockLevel,
  isActive: backendProduct.isActive,
  images: backendProduct.images?.map(img => img.driveViewLink).filter(Boolean) || [],
  tags: [], // Not available in current backend
  tenantId: backendProduct.tenantId || '',
  createdAt: backendProduct.createdAt,
  updatedAt: backendProduct.updatedAt,
});

const transformFrontendToBackend = (frontendProduct: CreateProductData): BackendCreateProductData => ({
  name: frontendProduct.name,
  description: frontendProduct.description,
  sku: frontendProduct.sku,
  barcode: frontendProduct.barcode,
  categoryId: frontendProduct.category || undefined,
  material: frontendProduct.material as any, // Backend expects enum
  weight: frontendProduct.weight,
  sellingPrice: frontendProduct.price,
  costPrice: frontendProduct.cost,
  stockQuantity: frontendProduct.stock,
  minStockLevel: frontendProduct.minStockLevel,
});

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

      const backendResponse = await apiClient.get<PaginatedResponse<BackendProduct>>(API_CONFIG.ENDPOINTS.PRODUCTS, params);
      
      return {
        ...backendResponse,
        data: backendResponse.data.map(transformBackendToFrontend)
      };
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product> {
    try {
      const backendProduct = await apiClient.get<BackendProduct>(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
      return transformBackendToFrontend(backendProduct);
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
      const backendProduct = await apiClient.get<BackendProduct>(endpoint);
      return transformBackendToFrontend(backendProduct);
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
      const backendProduct = await apiClient.get<BackendProduct>(endpoint);
      return transformBackendToFrontend(backendProduct);
    } catch (error) {
      console.error(`Failed to fetch product by SKU ${sku}:`, error);
      throw error;
    }
  }

  async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      const backendData = transformFrontendToBackend(productData);
      const backendProduct = await apiClient.post<BackendProduct>(API_CONFIG.ENDPOINTS.PRODUCTS, backendData);
      return transformBackendToFrontend(backendProduct);
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    try {
      // Transform frontend update data to backend format
      const backendData: any = {};
      if (productData.name !== undefined) backendData.name = productData.name;
      if (productData.description !== undefined) backendData.description = productData.description;
      if (productData.sku !== undefined) backendData.sku = productData.sku;
      if (productData.barcode !== undefined) backendData.barcode = productData.barcode;
      if (productData.category !== undefined) backendData.categoryId = productData.category;
      if (productData.material !== undefined) backendData.material = productData.material;
      if (productData.weight !== undefined) backendData.weight = productData.weight;
      if (productData.price !== undefined) backendData.sellingPrice = productData.price;
      if (productData.cost !== undefined) backendData.costPrice = productData.cost;
      if (productData.stock !== undefined) backendData.stockQuantity = productData.stock;
      if (productData.minStockLevel !== undefined) backendData.minStockLevel = productData.minStockLevel;
      if (productData.isActive !== undefined) backendData.isActive = productData.isActive;

      const backendProduct = await apiClient.put<BackendProduct>(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`, backendData);
      return transformBackendToFrontend(backendProduct);
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
      const backendProduct = await apiClient.post<BackendProduct>(endpoint, adjustment);
      return transformBackendToFrontend(backendProduct);
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