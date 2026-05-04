import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPermissions } from '@/types/user';

/**
 * Hook to check if the current user has permission to access specific components
 */
export const usePermissions = () => {
  const { auth } = useAuth();

  /**
   * Check if the user has permission to access a specific component
   * @param component - The component key from UserPermissions
   * @returns true if user has permission, false otherwise
   */
  const hasPermission = useMemo(() => {
    return (component: keyof UserPermissions): boolean => {
      if (!auth.user) return false;

      // Only OWNER role has unrestricted access to everything
      // All other roles (MANAGER, STAFF, READONLY) must have explicit permissions
      if (auth.user.role === 'OWNER') {
        return true;
      }

      // Load user's permissions from localStorage
      const storageKey = `user_permissions_${auth.user.id}`;
      const savedPermissions = localStorage.getItem(storageKey);

      if (!savedPermissions) {
        // If no permissions are set, deny access by default for STAFF and READONLY
        return false;
      }

      const permissions: UserPermissions = JSON.parse(savedPermissions);

      // Return true if permission is explicitly set to true
      return permissions[component] === true;
    };
  }, [auth.user]);

  /**
   * Check if user has permission to access multiple components
   * @param components - Array of component keys
   * @returns true if user has permission to at least one component
   */
  const hasAnyPermission = useMemo(() => {
    return (components: Array<keyof UserPermissions>): boolean => {
      return components.some(component => hasPermission(component));
    };
  }, [hasPermission]);

  /**
   * Check if user has permission to access all specified components
   * @param components - Array of component keys
   * @returns true if user has permission to all components
   */
  const hasAllPermissions = useMemo(() => {
    return (components: Array<keyof UserPermissions>): boolean => {
      return components.every(component => hasPermission(component));
    };
  }, [hasPermission]);

  /**
   * Get all permissions for the current user
   * @returns UserPermissions object or null if no permissions set
   */
  const getAllPermissions = useMemo(() => {
    return (): UserPermissions | null => {
      if (!auth.user) return null;

      // Only OWNER has all permissions by default
      // All other roles must have explicit permissions set
      if (auth.user.role === 'OWNER') {
        return {
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
          floatManagement: true,
          pettyCash: true,
          mainframe: true,
          financial_intelligence: true,
          hrms: true,
        };
      }

      const storageKey = `user_permissions_${auth.user.id}`;
      const savedPermissions = localStorage.getItem(storageKey);

      if (!savedPermissions) return null;

      return JSON.parse(savedPermissions);
    };
  }, [auth.user]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAllPermissions,
  };
};
