import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { auth } = useAuth();
  const location = useLocation();

  if (auth.loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control for STAFF users
  if (auth.user?.role === 'STAFF') {
    const allowedPaths = ['/pos', '/sales', '/cash-up', '/shifts', '/repairs', '/customers', '/inventory', '/calendar', '/search'];
    const currentPath = location.pathname;

    // If STAFF user tries to access a restricted page, redirect to POS
    if (!allowedPaths.some(path => currentPath.startsWith(path))) {
      return <Navigate to="/pos" replace />;
    }
  }

  // User is authenticated and authorized, render the protected component
  return <>{children}</>;
};

export default PrivateRoute;