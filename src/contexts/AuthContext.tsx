import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, LoginCredentials, RegisterData, ChangePasswordData } from '../services/authService';

// Define notification types
export type NotificationType = 'payment' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isNew: boolean;
  link?: string;
}

// Define the subscription type
interface Subscription {
  plan: 'basic' | 'standard' | 'premium';
  status: 'active' | 'expired' | 'pending';
  startDate: string;
  endDate: string;
  price: number;
}

export type TenantStatus = 'ACTIVE' | 'PAYMENT_DUE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'INACTIVE' | null;

export interface TenantInfo {
  status: TenantStatus;
  suspendedReason?: string | null; // 'MANUAL' | 'PAYMENT_OVERDUE'
  billingDueDate?: string | null;
  billingDaysOverdue?: number | null;
  tenantSlug?: string | null;
  tenantName?: string | null;
}

// Define the authentication state type
interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
  tenantInfo: TenantInfo;
  subscription: Subscription;
  notifications: Notification[];
  loading: boolean;
  error: string | null;
}

// Define the context type
interface AuthContextType {
  auth: AuthState;
  login: (email: string, password: string, companySlug?: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (passwordData: ChangePasswordData) => Promise<boolean>;
  updateSubscription: (subscription: Subscription) => void;
  renewSubscription: (months: number) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isNew'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  refreshTenantStatus: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage key for UI-specific data (notifications, subscription)
const AUTH_UI_STORAGE_KEY = 'mps_auth_ui_data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state - start with loading true to check authentication
  const [auth, setAuth] = useState<AuthState>(() => {
    // Get UI-specific data from localStorage (notifications, subscription)
    const storedUIData = localStorage.getItem(AUTH_UI_STORAGE_KEY);
    let uiData = null;
    
    if (storedUIData) {
      uiData = JSON.parse(storedUIData);
    }
    
    // Default subscription data
    const currentDate = new Date();
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    // Default notifications
    const paymentDueDate = new Date(currentDate);
    paymentDueDate.setDate(paymentDueDate.getDate() + 7);
    
    return {
      user: null,
      isAuthenticated: false,
      loading: true, // Start with loading true
      error: null,
      tenantInfo: { status: null },
      subscription: uiData?.subscription || {
        plan: 'standard' as const,
        status: 'active' as const,
        startDate: currentDate.toISOString(),
        endDate: endDate.toISOString(),
        price: 49.99
      },
      notifications: uiData?.notifications || [
        {
          id: '1',
          type: 'payment',
          title: 'Payment Due',
          message: `Your next payment of £100.00 is due on ${paymentDueDate.toLocaleDateString()}. Please ensure sufficient funds are available.`,
          time: '2 days ago',
          isNew: true,
          link: '/subscription'
        },
        {
          id: '2',
          type: 'system',
          title: 'License Expiring',
          message: 'Your system license will expire in 15 days. Please renew to avoid service interruption.',
          time: 'Yesterday',
          isNew: true,
          link: '/subscription'
        }
      ]
    };
  });

  // Helper: compute billing days overdue from billingDueDate
  const calcDaysOverdue = (billingDueDate?: string | null): number | null => {
    if (!billingDueDate) return null;
    const due = new Date(billingDueDate).getTime();
    const now = Date.now();
    if (now <= due) return 0;
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

  // Helper: build TenantInfo from getMe response
  const buildTenantInfo = (me: any): TenantInfo => {
    const tenant = me.tenant as any;
    // Fall back to tenantId if subdomain is missing — covers tenants provisioned
    // before subdomain was reliably stored (e.g. 'testb' company-code tenants).
    if (!tenant) return { status: 'ACTIVE', tenantSlug: me.tenantId ?? null };
    return {
      status: tenant.status as TenantStatus,
      suspendedReason: tenant.suspendedReason ?? null,
      billingDueDate: tenant.billingDueDate ?? null,
      billingDaysOverdue: calcDaysOverdue(tenant.billingDueDate),
      tenantSlug: tenant.subdomain ?? tenant.slug ?? me.tenantId ?? null,
      tenantName: tenant.name ?? null,
    };
  };

  // Check authentication status on mount — call /auth/me so we always
  // get the real user name/role from the server, not just the JWT payload
  useEffect(() => {
    // Call /auth/me, retrying transient backend failures (no response, timeout,
    // 5xx, 429) with a short backoff. Genuine auth errors (401/403) are thrown
    // immediately so the caller can act on them without waiting out retries.
    const getMeWithRetry = async (attempts = 3): Promise<any> => {
      for (let i = 0; i < attempts; i++) {
        try {
          return await authService.getMe();
        } catch (err: any) {
          const status = err?.response?.status ?? err?.status ?? err?.statusCode;
          const isTransient =
            status === undefined || status === 0 || status === 408 ||
            status === 429 || status >= 500;
          // Don't retry real auth failures, and don't sleep after the last try.
          if (!isTransient || i === attempts - 1) throw err;
          await new Promise(res => setTimeout(res, 400 * (i + 1)));
        }
      }
    };

    const checkAuthStatus = async () => {
      try {
        const accessToken = authService.getToken();
        const refreshToken = localStorage.getItem('refreshToken');

        // No credentials at all — skip the API call
        if (!accessToken && !refreshToken) {
          setAuth(prev => ({ ...prev, user: null, isAuthenticated: false, loading: false }));
          return;
        }

        // Call /auth/me. If the access token is expired the apiClient interceptor
        // will automatically use the refresh token to get a new one and retry.
        // Retry transient failures (backend briefly saturated under load) with a
        // short backoff before giving up — a network blip must NOT log a cashier
        // out mid-shift.
        const me = await getMeWithRetry();
        setAuth(prev => ({
          ...prev,
          user: {
            id: me.id,
            name: `${me.firstName} ${me.lastName}`.trim(),
            email: me.email,
            role: me.role,
          },
          tenantInfo: buildTenantInfo(me),
          isAuthenticated: true,
          loading: false,
        }));
        return;
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status ?? err?.statusCode;

        // 403 TENANT_SUSPENDED — show the suspension screen without logging out
        if (status === 403) {
          const data = err?.response?.data || err?.data || {};
          setAuth(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            tenantInfo: {
              status: 'SUSPENDED',
              suspendedReason: data.reason || 'MANUAL',
            },
          }));
          return;
        }

        // Transient backend failure (no response, timeout, 5xx, 429) — the token
        // is almost certainly still valid, the backend was just briefly
        // unreachable (e.g. saturated by a burst of image/thumbnail requests on
        // cold cache). Do NOT clear auth. If the stored access token is still
        // locally valid, keep the session so the shop keeps trading; the app's
        // own requests will succeed once the backend recovers. Only a genuine
        // 401 (below) means the credentials are actually bad.
        const isTransient =
          status === undefined || status === 0 || status === 408 ||
          status === 429 || status >= 500;
        const accessToken = authService.getToken();
        if (isTransient && accessToken && isTokenValid(accessToken)) {
          console.warn(
            '⚠️ /auth/me failed transiently (status:', status,
            ') — keeping session, backend likely saturated.'
          );
          setAuth(prev => ({ ...prev, isAuthenticated: true, loading: false }));
          return;
        }

        // Genuine auth failure (401 / invalid or expired credentials with no
        // usable token) — force logout.
        authService.clearAuth();
        setAuth(prev => ({ ...prev, user: null, isAuthenticated: false, loading: false }));
      }
    };

    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow components to manually re-check tenant status (e.g. after payment)
  const refreshTenantStatus = async (): Promise<void> => {
    try {
      const me = await authService.getMe();
      setAuth(prev => ({ ...prev, tenantInfo: buildTenantInfo(me) }));
    } catch {
      // ignore
    }
  };

  // Function to check if token is still valid (not expired)
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired (with 5 minute buffer)
      return payload.exp && payload.exp > (currentTime + 300);
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  // Save UI-specific data to localStorage
  useEffect(() => {
    const uiData = {
      subscription: auth.subscription,
      notifications: auth.notifications
    };
    localStorage.setItem(AUTH_UI_STORAGE_KEY, JSON.stringify(uiData));
  }, [auth.subscription, auth.notifications]);

  // Login function
  const login = async (email: string, password: string, companySlug?: string): Promise<boolean> => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.login({ email, password, companySlug });

      // Save user permissions to localStorage
      const userId = response.user.id;
      const userRole = response.user.role;
      const permissionKey = `user_permissions_${userId}`;

      // If user has permissions in response, save them
      if (response.user.permissions) {
        localStorage.setItem(permissionKey, JSON.stringify(response.user.permissions));
      } else {
        // Create default permissions based on role
        let defaultPermissions = {};

        if (userRole === 'OWNER') {
          // OWNER has all permissions
          defaultPermissions = {
            dashboard: true,
            pos: true,
            sales: true,
            cashiers: true,
            repairs: true,
            customers: true,
            inventory: true,
            stockTaking: true,
            calendar: true,
            history: true,
            search: true,
            settings: true,
            userManagement: true,
            subscription: true,
          };
        } else if (userRole === 'MANAGER') {
          // MANAGER has most permissions except user management
          defaultPermissions = {
            dashboard: true,
            pos: true,
            sales: true,
            cashiers: true,
            repairs: true,
            customers: true,
            inventory: true,
            stockTaking: true,
            calendar: true,
            history: true,
            search: true,
            settings: false,
            userManagement: false,
            subscription: false,
          };
        } else if (userRole === 'STAFF') {
          // STAFF/CASHIER has basic POS and customer access
          defaultPermissions = {
            dashboard: true,
            pos: true,
            sales: true,
            cashiers: false,
            repairs: true,
            customers: true,
            inventory: true,
            stockTaking: false,
            calendar: true,
            history: false,
            search: true,
            settings: false,
            userManagement: false,
            subscription: false,
          };
        } else if (userRole === 'READONLY') {
          // READONLY has view-only access
          defaultPermissions = {
            dashboard: true,
            pos: false,
            sales: true,
            cashiers: false,
            repairs: true,
            customers: true,
            inventory: true,
            stockTaking: false,
            calendar: true,
            history: true,
            search: true,
            settings: false,
            userManagement: false,
            subscription: false,
          };
        }

        localStorage.setItem(permissionKey, JSON.stringify(defaultPermissions));
      }

      setAuth(prev => ({
        ...prev,
        user: {
          id: response.user.id,
          name: `${response.user.firstName} ${response.user.lastName}`,
          email: response.user.email,
          role: response.user.role
        },
        tenantInfo: buildTenantInfo(response),
        isAuthenticated: true,
        loading: false,
        error: null
      }));

      // Fetch full tenant info (including subdomain) immediately after login
      // so tenant-gated features activate without requiring a page refresh.
      authService.getMe().then(me => {
        setAuth(prev => ({ ...prev, tenantInfo: buildTenantInfo(me) }));
      }).catch(() => {});

      return true;
    } catch (error: any) {
      console.error('Login failed:', error);

      // 403 TENANT_SUSPENDED — set suspension state and throw typed error
      // so the Login page can suppress the generic toast and show the screen instead
      if (error.statusCode === 403 && error.data?.code === 'TENANT_SUSPENDED') {
        setAuth(prev => ({
          ...prev,
          loading: false,
          tenantInfo: {
            status: 'SUSPENDED',
            suspendedReason: error.data?.reason || 'MANUAL',
          },
        }));
        const err: any = new Error('Account suspended');
        err.code = 'TENANT_SUSPENDED';
        throw err;
      }

      setAuth(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: error.message || 'Login failed'
      }));

      return false;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<boolean> => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authService.register(userData);
      
      setAuth(prev => ({
        ...prev,
        user: {
          id: response.user.id,
          name: `${response.user.firstName} ${response.user.lastName}`,
          email: response.user.email,
          role: response.user.role
        },
        isAuthenticated: true,
        loading: false,
        error: null
      }));
      
      return true;
    } catch (error: any) {
      console.error('Registration failed:', error);
      setAuth(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: error.message || 'Registration failed'
      }));
      
      return false;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setAuth(prev => ({ ...prev, loading: true }));

    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all authentication data
      authService.clearAuth();

      // Clear UI data from localStorage
      localStorage.removeItem(AUTH_UI_STORAGE_KEY);

      // Clear the service worker navigation cache so the login page is
      // always fetched fresh — prevents stale cached page showing after logout
      if ('caches' in window) {
        caches.delete('navigation-cache').catch(() => {});
      }

      // Replace history entry so the user can't go back to the authed app
      // and use location.replace so the browser fetches a fresh response
      window.location.replace('/login');
    }
  };

  // Change password function
  const changePassword = async (passwordData: ChangePasswordData): Promise<boolean> => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      await authService.changePassword(passwordData);

      setAuth(prev => ({ ...prev, loading: false, error: null }));
      return true;
    } catch (error: any) {
      const message = error.message || 'Password change failed';
      setAuth(prev => ({ ...prev, loading: false, error: message }));
      // Re-throw so the calling component can show the real backend error
      throw new Error(message);
    }
  };
  
  // Update subscription function
  const updateSubscription = (subscription: Subscription): void => {
    setAuth({
      ...auth,
      subscription
    });
  };
  
  // Renew subscription function
  const renewSubscription = (months: number): void => {
    const currentEndDate = new Date(auth.subscription.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);
    
    const updatedSubscription: Subscription = {
      ...auth.subscription,
      status: 'active',
      endDate: newEndDate.toISOString()
    };
    
    setAuth({
      ...auth,
      subscription: updatedSubscription
    });
  };

  // Add notification function
  const addNotification = (notification: Omit<Notification, 'id' | 'time' | 'isNew'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      time: 'Just now',
      isNew: true
    };
    
    setAuth(prevAuth => ({
      ...prevAuth,
      notifications: [newNotification, ...prevAuth.notifications]
    }));
  };
  
  // Mark notification as read
  const markNotificationAsRead = (id: string) => {
    setAuth(prevAuth => ({
      ...prevAuth,
      notifications: prevAuth.notifications.map(notification => 
        notification.id === id ? { ...notification, isNew: false } : notification
      )
    }));
  };
  
  // Clear notification
  const clearNotification = (id: string) => {
    setAuth(prevAuth => ({
      ...prevAuth,
      notifications: prevAuth.notifications.filter(notification => notification.id !== id)
    }));
  };

  return (
    <AuthContext.Provider value={{
      auth,
      login,
      register,
      logout,
      changePassword,
      updateSubscription,
      renewSubscription,
      addNotification,
      markNotificationAsRead,
      clearNotification,
      refreshTenantStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
