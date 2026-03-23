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

// Define the authentication state type
interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
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

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          // Validate token by checking if user data is valid
          const currentUser = authService.getCurrentUser();
          if (currentUser && isTokenValid(token)) {
            setAuth(prev => ({
              ...prev,
              user: currentUser,
              isAuthenticated: true,
              loading: false
            }));
            return;
          }
        }
        
        // No valid token found, clear any stale data
        authService.clearAuth();
        setAuth(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          loading: false
        }));
        
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.clearAuth();
        setAuth(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          loading: false,
          error: 'Authentication check failed'
        }));
      }
    };

    checkAuthStatus();
  }, []);

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
        isAuthenticated: true,
        loading: false,
        error: null
      }));

      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
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
      clearNotification
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
