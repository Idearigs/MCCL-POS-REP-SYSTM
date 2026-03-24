import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TenantSuspendedScreen from './TenantSuspendedScreen';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { auth, logout } = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Suspended tenant — show full-screen suspension message (not login)
  const tenantStatus = auth.tenantInfo?.status;
  if (tenantStatus === 'SUSPENDED') {
    return <TenantSuspendedScreen tenantInfo={auth.tenantInfo} onLogout={logout} />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control for STAFF users
  if (auth.user?.role === 'STAFF') {
    const allowedPaths = ['/pos', '/sales', '/cash-up', '/shifts', '/repairs', '/customers', '/inventory', '/calendar', '/search'];
    const currentPath = location.pathname;

    if (!allowedPaths.some(path => currentPath.startsWith(path))) {
      return <Navigate to="/pos" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;
