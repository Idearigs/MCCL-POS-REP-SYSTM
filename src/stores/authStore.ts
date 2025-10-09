import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/authService';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'READONLY';
  tenantId: string;
  permissions?: string[];
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  // Authentication actions
  login: (email: string, password: string, tenantId?: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  
  // User management
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  
  // State management
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Utility functions
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isTokenExpired: () => boolean;
  getAuthHeader: () => string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  tenantId?: string;
}

type AuthStore = AuthState & AuthActions;

// Secure token storage configuration
const secureStorage = createJSONStorage(() => localStorage, {
  reviver: (key, value) => {
    // Validate stored tokens
    if (key === 'tokens' && value) {
      const now = Date.now();
      if (value.expiresAt && now > value.expiresAt) {
        return null; // Token expired
      }
    }
    return value;
  },
});

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Authentication actions
      login: async (email: string, password: string, tenantId?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login({
            email,
            password,
            tenantId: tenantId || 'buymejewellery', // Default tenant
          });

          if (response.success) {
            const tokens: AuthTokens = {
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
            };

            set({
              user: response.data.user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } else {
            set({
              isLoading: false,
              error: response.message || 'Login failed',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
          });
          return false;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.register(userData);
          
          if (response.success) {
            // Auto-login after successful registration
            return await get().login(userData.email, userData.password, userData.tenantId);
          } else {
            set({
              isLoading: false,
              error: response.message || 'Registration failed',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          const { tokens } = get();
          if (tokens?.refreshToken) {
            await authService.logout(tokens.refreshToken);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return false;

        set({ isLoading: true });
        
        try {
          const response = await authService.refreshToken(tokens.refreshToken);
          
          if (response.success) {
            const newTokens: AuthTokens = {
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              expiresAt: Date.now() + (15 * 60 * 1000),
            };

            set({
              tokens: newTokens,
              isLoading: false,
            });

            return true;
          } else {
            // Refresh failed, logout user
            await get().logout();
            return false;
          }
        } catch (error) {
          await get().logout();
          return false;
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.updateProfile(userData);
          
          if (response.success) {
            set(state => ({
              user: state.user ? { ...state.user, ...userData } : null,
              isLoading: false,
            }));
            return true;
          } else {
            set({
              isLoading: false,
              error: response.message || 'Profile update failed',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Profile update failed',
          });
          return false;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.changePassword({
            currentPassword,
            newPassword,
          });
          
          if (response.success) {
            set({ isLoading: false });
            return true;
          } else {
            set({
              isLoading: false,
              error: response.message || 'Password change failed',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Password change failed',
          });
          return false;
        }
      },

      // State management
      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ tokens }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Utility functions
      hasPermission: (permission: string) => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },

      hasRole: (roles: string | string[]) => {
        const { user } = get();
        if (!user) return false;
        
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },

      isTokenExpired: () => {
        const { tokens } = get();
        if (!tokens) return true;
        return Date.now() > tokens.expiresAt;
      },

      getAuthHeader: () => {
        const { tokens, isTokenExpired } = get();
        if (!tokens || isTokenExpired()) return null;
        return `Bearer ${tokens.accessToken}`;
      },
    }),
    {
      name: 'auth-store',
      storage: secureStorage,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);