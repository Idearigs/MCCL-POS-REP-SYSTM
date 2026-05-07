// Authentication Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  companySlug?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    tenantId: string;
  };
  expiresIn: number;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const loginData: Record<string, string> = {
        email: credentials.email,
        password: credentials.password,
      };
      if (credentials.companySlug) {
        loginData.companySlug = credentials.companySlug;
      }

      const response = await apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.LOGIN, loginData);

      // Store tokens and tenantId using apiClient's method
      if (response.accessToken && response.refreshToken) {
        apiClient.setTokens(response.accessToken, response.refreshToken);
        if (response.user?.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
        }
        // Load this tenant's QZ Tray certificate silently in the background
        this.fetchAndStoreQzConfig().catch(() => {});
      } else {
        console.error('❌ No tokens received from backend');
      }

      return response;
    } catch (error: any) {
      console.error('Login failed:', error);
      // Re-throw original error so callers can inspect statusCode and data
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.REGISTER, userData);
      
      // Store tokens using apiClient's method
      if (response.accessToken && response.refreshToken) {
        apiClient.setTokens(response.accessToken, response.refreshToken);
        console.log('🔑 Registration tokens stored successfully');
      }
      
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Always clear tokens on logout, even if request fails
      apiClient.removeTokens();
    }
  }

  async changePassword(passwordData: ChangePasswordData): Promise<void> {
    try {
      // Backend DTO only accepts currentPassword + newPassword.
      // Sending confirmPassword triggers forbidNonWhitelisted → 400.
      await apiClient.patch(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to change password';
      throw new Error(message);
    }
  }

  async getMe(): Promise<{ id: string; firstName: string; lastName: string; email: string; role: string; tenantId: string }> {
    return apiClient.get('/auth/me');
  }

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  getCurrentUser(): any {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      // Simple JWT decode (not for production security, just for UI purposes)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: payload.tenantId,
      };
    } catch (error) {
      console.error('Error parsing user token:', error);
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  clearAuth(): void {
    apiClient.removeTokens();
    localStorage.removeItem('tenantId');
    localStorage.removeItem('qz_certificate');
    localStorage.removeItem('qz_private_key');
    localStorage.removeItem('mps_selected_outlet');
  }

  async fetchAndStoreQzConfig(): Promise<void> {
    try {
      const data = await apiClient.get<{ certificate: string; privateKey: string }>('/auth/qz-config');
      if (data.certificate && data.privateKey) {
        const { storeQzConfig } = await import('../utils/qzBridge');
        storeQzConfig(data.certificate, data.privateKey);
      }
    } catch {
      // QZ config is optional — don't break login if it fails
    }
  }
}

export const authService = new AuthService();
export default authService;