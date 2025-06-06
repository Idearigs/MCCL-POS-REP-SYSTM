import React, { createContext, useContext, useState, useEffect } from 'react';

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
  username: string;
  password: string;
  isAuthenticated: boolean;
  subscription: Subscription;
  notifications: Notification[];
}

// Define the context type
interface AuthContextType {
  auth: AuthState;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
  updateSubscription: (subscription: Subscription) => void;
  renewSubscription: (months: number) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isNew'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default credentials
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'password';

// Local storage key
const AUTH_STORAGE_KEY = 'mccl_pos_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from local storage or defaults
  const [auth, setAuth] = useState<AuthState>(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      return JSON.parse(storedAuth);
    }
    // Default subscription data
    const currentDate = new Date();
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + 1); // Default 1 month subscription
    
    // Default notifications
    const paymentDueDate = new Date(currentDate);
    paymentDueDate.setDate(paymentDueDate.getDate() + 7); // Payment due in 7 days
    
    return {
      username: DEFAULT_USERNAME,
      password: DEFAULT_PASSWORD,
      isAuthenticated: false,
      subscription: {
        plan: 'standard' as const,
        status: 'active' as const,
        startDate: currentDate.toISOString(),
        endDate: endDate.toISOString(),
        price: 49.99
      },
      notifications: [
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

  // Update local storage when auth changes
  useEffect(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  }, [auth]);

  // Login function
  const login = (username: string, password: string): boolean => {
    if (username === auth.username && password === auth.password) {
      setAuth({
        ...auth,
        isAuthenticated: true
      });
      return true;
    }
    return false;
  };

  // Logout function
  const logout = () => {
    setAuth({
      ...auth,
      isAuthenticated: false
    });
  };

  // Change password function
  const changePassword = (currentPassword: string, newPassword: string): boolean => {
    if (currentPassword === auth.password) {
      setAuth({
        ...auth,
        password: newPassword
      });
      return true;
    }
    return false;
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
