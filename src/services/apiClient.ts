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
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

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
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ No access token found for API request:', config.url);
        }

        // Add tenant ID header (lowercase as expected by backend)
        config.headers['x-tenant-id'] = API_CONFIG.TENANT_ID;

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
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newTokens = await this.refreshAccessToken();
            if (newTokens) {
              // Retry all queued requests with new token
              this.refreshSubscribers.forEach(callback => callback(newTokens.accessToken));
              this.refreshSubscribers = [];

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              }
              return this.client(originalRequest);
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            this.refreshSubscribers = [];
            this.handleAuthenticationFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
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
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 Token loaded:', this.token ? 'YES' : 'NO');
      console.log('🔄 Refresh token loaded:', this.refreshToken ? 'YES' : 'NO');
    }
  }

  private async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (!this.refreshToken) {
      console.warn('⚠️ No refresh token available');
      return null;
    }

    try {
      console.log('🔄 Attempting to refresh access token...');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`,
        {
          refreshToken: this.refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': API_CONFIG.TENANT_ID,
          },
        }
      );

      const { accessToken, refreshToken } = response.data;
      this.setTokens(accessToken, refreshToken);
      console.log('✅ Access token refreshed successfully');
      return { accessToken, refreshToken };
    } catch (error: any) {
      console.error('❌ Failed to refresh token:', error.response?.data || error.message);
      return null;
    }
  }

  private handleAuthenticationFailure() {
    this.removeTokens();
    // Redirect to login page
    window.location.href = '/login';
  }

  public setTokens(accessToken: string, refreshToken: string) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Schedule token refresh before expiration (optional - for proactive refresh)
    this.scheduleTokenRefresh(accessToken);
  }

  private scheduleTokenRefresh(token: string) {
    try {
      // Decode JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // Refresh 1 minute before expiration
      const refreshTime = timeUntilExpiry - 60000;

      if (refreshTime > 0) {
        console.log(`🕐 Token will be refreshed in ${Math.floor(refreshTime / 1000)} seconds`);
        setTimeout(async () => {
          console.log('🔄 Proactively refreshing token before expiration...');
          await this.refreshAccessToken();
        }, refreshTime);
      }
    } catch (error) {
      // Ignore errors in token decoding
      console.warn('⚠️ Could not schedule token refresh:', error);
    }
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
  async get<T = any>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, { params, ...config });
    return response.data;
  }

  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(endpoint, data, config);
    return response.data;
  }

  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(endpoint, data, config);
    return response.data;
  }

  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(endpoint, data, config);
    return response.data;
  }

  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(endpoint, config);
    return response.data;
  }

  // File upload method
  async uploadFile<T = any>(endpoint: string, file: File, fieldName: string = 'file', additionalData?: any): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

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