// Authentication Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.LOGIN, credentials);
      
      // Store tokens using apiClient's method
      if (response.tokens) {
        apiClient.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.REGISTER, userData);
      
      // Store tokens using apiClient's method
      if (response.tokens) {
        apiClient.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
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
      await apiClient.post(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, passwordData);
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
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
  }
}

export const authService = new AuthService();
export default authService;