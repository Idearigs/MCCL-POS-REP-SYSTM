import React, { createContext, useContext, useState, useEffect } from 'react';
import { mainframeAdminApi } from '../services/api';

interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored admin session
    const storedAdmin = localStorage.getItem('mf_admin_user');
    const storedToken = localStorage.getItem('mf_admin_token');

    if (storedAdmin && storedToken) {
      setAdmin(JSON.parse(storedAdmin));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await mainframeAdminApi.login(email, password);
      const { token, admin: adminInfo } = response.data;
      const { id, firstName, lastName, role, email: adminEmail } = adminInfo;

      const adminData: Admin = {
        id,
        email: adminEmail,
        firstName,
        lastName,
        role,
      };

      // Store the JWT returned by the backend
      localStorage.setItem('mf_admin_user', JSON.stringify(adminData));
      localStorage.setItem('mf_admin_token', token);

      setAdmin(adminData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('mf_admin_user');
    localStorage.removeItem('mf_admin_token');
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, login, logout }}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
