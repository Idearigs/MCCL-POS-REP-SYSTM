import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { UserPermissions } from '@/types/user';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: keyof UserPermissions;
  fallbackPath?: string;
  showAlert?: boolean;
}

/**
 * Component that guards content based on user permissions
 * Redirects to fallback path if user doesn't have permission
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  fallbackPath = '/dashboard',
  showAlert = true,
}) => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = () => {
      const access = hasPermission(permission);
      setHasAccess(access);

      if (!access) {
        if (showAlert) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this page',
            variant: 'destructive',
          });
        }
        navigate(fallbackPath, { replace: true });
      }
    };

    checkPermission();
  }, [permission, hasPermission, navigate, toast, fallbackPath, showAlert]);

  // Show loading state while checking permissions
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If no access, show access denied (backup in case navigation fails)
  if (!hasAccess) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If has access, render children
  return <>{children}</>;
};

export default PermissionGuard;
