# 🔗 Frontend Integration Guide for MPS Jewelry Backend

This guide helps you integrate the MPS React frontend with the newly built backend API.

## 🏃‍♂️ Quick Start Integration

### 1. Update Frontend API Configuration

Navigate to your frontend folder and update the API configuration:

```typescript
// Frontend/src/config/api.ts
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    
    // Customers
    CUSTOMERS: '/customers',
    CUSTOMER_STATS: '/customers/stats',
    CUSTOMER_EXPORT: '/customers/gdpr/export',
    
    // Products/Inventory
    PRODUCTS: '/products',
    PRODUCT_STATS: '/products/stats',
    LOW_STOCK: '/products/low-stock',
    ADJUST_STOCK: '/products/{id}/adjust-stock',
    
    // Sales/POS
    SALES: '/sales',
    SALES_STATS: '/sales/stats',
    CREATE_SALE: '/sales',
    REFUND_SALE: '/sales/{id}/refund',
    
    // Repairs
    REPAIRS: '/repairs',
    REPAIR_STATS: '/repairs/stats',
    REPAIR_NOTES: '/repairs/{id}/notes',
    
    // Health
    HEALTH: '/health'
  }
};
```

### 2. Create API Client Service

```typescript
// Frontend/src/services/apiClient.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.token) {
          // Token expired, try to refresh or logout
          this.token = null;
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('accessToken');
  }

  // Generic API methods
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(endpoint);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### 3. Update Authentication Service

```typescript
// Frontend/src/services/authService.ts
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
  };
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.LOGIN,
      credentials
    );
    
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.REGISTER,
      data
    );
    
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.removeToken();
      localStorage.removeItem('refreshToken');
    }
  }

  async refreshToken(): Promise<AuthResponse | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.REFRESH,
        { refreshToken }
      );
      
      if (response.accessToken) {
        apiClient.setToken(response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      return response;
    } catch (error) {
      localStorage.removeItem('refreshToken');
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }
}

export const authService = new AuthService();
```

### 4. Create Customer Service

```typescript
// Frontend/src/services/customerService.ts
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  totalSpent: number;
  visitCount: number;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  dataProcessingConsent: boolean;
}

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class CustomerService {
  async getCustomers(query: CustomerQuery = {}) {
    return apiClient.get(API_CONFIG.ENDPOINTS.CUSTOMERS, query);
  }

  async getCustomer(id: string): Promise<Customer> {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`);
  }

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    return apiClient.post(API_CONFIG.ENDPOINTS.CUSTOMERS, data);
  }

  async updateCustomer(id: string, data: Partial<CreateCustomerData>): Promise<Customer> {
    return apiClient.patch(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.CUSTOMERS}/${id}`);
  }

  async getCustomerStats() {
    return apiClient.get(API_CONFIG.ENDPOINTS.CUSTOMER_STATS);
  }

  async exportCustomerData(customerId: string) {
    return apiClient.post(API_CONFIG.ENDPOINTS.CUSTOMER_EXPORT, { customerId });
  }
}

export const customerService = new CustomerService();
```

### 5. Create Product/Inventory Service

```typescript
// Frontend/src/services/productService.ts
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  material: string;
  purity?: string;
  weight?: number;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  sku: string;
  category: string;
  material: string;
  purity?: string;
  weight?: number;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  description?: string;
}

class ProductService {
  async getProducts(query: any = {}) {
    return apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS, query);
  }

  async getProduct(id: string): Promise<Product> {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    return apiClient.post(API_CONFIG.ENDPOINTS.PRODUCTS, data);
  }

  async updateProduct(id: string, data: Partial<CreateProductData>): Promise<Product> {
    return apiClient.patch(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`, data);
  }

  async deleteProduct(id: string): Promise<void> {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
  }

  async adjustStock(id: string, data: { quantity: number; type: string; reason: string }) {
    return apiClient.post(
      API_CONFIG.ENDPOINTS.ADJUST_STOCK.replace('{id}', id),
      data
    );
  }

  async getProductStats() {
    return apiClient.get(API_CONFIG.ENDPOINTS.PRODUCT_STATS);
  }

  async getLowStockReport() {
    return apiClient.get(API_CONFIG.ENDPOINTS.LOW_STOCK);
  }
}

export const productService = new ProductService();
```

### 6. Update Environment Variables

Create or update your frontend `.env` file:

```bash
# Frontend/.env.local
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_API_TIMEOUT=10000
REACT_APP_TENANT_ID=buymejewellery
```

## 🔄 Integration Testing Steps

### 1. Start Both Servers
```bash
# Terminal 1: Start Backend
cd MPS/backend
npm run start:dev

# Terminal 2: Start Frontend  
cd MPS/Frontend
npm run dev
```

### 2. Test Authentication Flow
1. Visit `http://localhost:5173/login`
2. Try to login/register
3. Check browser network tab for API calls
4. Verify JWT tokens are stored in localStorage

### 3. Test API Endpoints
```bash
# In backend folder
npx ts-node src/api-test.ts
```

### 4. Test Frontend-Backend Communication
1. Login to frontend
2. Navigate to customers page
3. Try to create a new customer
4. Check if data appears in both frontend and backend
5. Verify API calls in browser DevTools

## 🐛 Common Integration Issues & Fixes

### CORS Errors
If you see CORS errors, update backend CORS configuration:

```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
});
```

### Authentication Issues
1. Check if JWT tokens are being sent in requests
2. Verify token format in localStorage
3. Check backend logs for authentication errors

### Data Format Issues
1. Ensure frontend TypeScript interfaces match backend DTOs
2. Check date format conversions
3. Verify required fields in API requests

## 📊 API Endpoint Reference

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout

### Customer Endpoints
- `GET /customers` - List customers (paginated)
- `POST /customers` - Create customer
- `GET /customers/:id` - Get customer details
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer
- `GET /customers/stats` - Customer statistics

### Product Endpoints
- `GET /products` - List products
- `POST /products` - Create product
- `GET /products/:id` - Get product details
- `PATCH /products/:id` - Update product
- `POST /products/:id/adjust-stock` - Adjust stock
- `GET /products/stats` - Inventory statistics

### Sales Endpoints
- `GET /sales` - List sales
- `POST /sales` - Create sale
- `GET /sales/:id` - Get sale details
- `POST /sales/:id/refund` - Process refund
- `GET /sales/stats` - Sales analytics

### Repair Endpoints
- `GET /repairs` - List repairs
- `POST /repairs` - Create repair
- `GET /repairs/:id` - Get repair details
- `PATCH /repairs/:id` - Update repair
- `POST /repairs/:id/notes` - Add repair note

## 🎯 Next Steps

1. **Setup Database**: Follow the database setup guide
2. **Start Backend**: `npm run start:dev` in backend folder
3. **Update Frontend**: Implement the API services above
4. **Test Integration**: Use the provided test scripts
5. **Deploy**: Configure for production environment

## 🆘 Getting Help

- Backend API Documentation: `http://localhost:3000/api`
- Test backend components: `npx ts-node src/simple-test.ts`
- Test API endpoints: `npx ts-node src/api-test.ts`
- Check backend logs for detailed error information

---

**Your backend is ready for integration! 🚀**