// API Client Service for MPS Jewelry Backend
import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { API_CONFIG, ApiError } from '../config/api';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL || API_CONFIG.BASE_URL,
      timeout: config.timeout || API_CONFIG.TIMEOUT,
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...config.headers,
      },
    });

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and tenant headers
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        // Add tenant ID header
        config.headers['X-Tenant-ID'] = API_CONFIG.TENANT_ID;

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔗 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshAccessToken();
            if (newTokens && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            this.handleAuthenticationFailure();
          }
        }

        // Handle other errors
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An unexpected error occurred',
          statusCode: error.response?.status || 0,
          error: error.response?.data?.error,
          timestamp: new Date().toISOString(),
        };

        console.error('❌ API Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  private loadTokenFromStorage() {
    this.token = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
        refreshToken: this.refreshToken,
      });

      const { accessToken, refreshToken } = response.data;
      this.setTokens(accessToken, refreshToken);
      return { accessToken, refreshToken };
    } catch (error) {
      return null;
    }
  }

  private handleAuthenticationFailure() {
    this.removeTokens();
    
    // Clear any stored UI data
    localStorage.removeItem('mps_auth_ui_data');
    
    // Show a toast notification if available
    try {
      const event = new CustomEvent('auth:expired', {
        detail: { message: 'Your session has expired. Please log in again.' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.log('Session expired notification could not be sent');
    }
    
    // Redirect to login page with current location
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  public setTokens(accessToken: string, refreshToken: string) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  public removeTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(endpoint, data);
    return response.data;
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(endpoint, data);
    return response.data;
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(endpoint);
    return response.data;
  }

  // File upload method
  async uploadFile<T = any>(endpoint: string, file: File, additionalData?: any): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const response: AxiosResponse<T> = await this.client.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Utility method to replace URL parameters
  replaceUrlParams(endpoint: string, params: Record<string, string | number>): string {
    let url = endpoint;
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, String(value));
    });
    return url;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.get(API_CONFIG.ENDPOINTS.HEALTH);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export the class for testing purposes
export { ApiClient };