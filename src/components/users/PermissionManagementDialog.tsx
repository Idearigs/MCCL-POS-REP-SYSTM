import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Lock,
  Unlock,
  Shield,
  Tag,
  TrendingUp,
  Users,
  FileText,
  User as UserIcon,
  Package,
  ClipboardCheck,
  Calendar as CalendarIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  UserCog,
  CreditCard,
  Database,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { User, UserPermissions } from '../../types/user';
import { Card, CardContent } from '../ui/card';

interface PermissionManagementDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: UserPermissions) => Promise<void>;
}

interface SystemComponent {
  key: keyof UserPermissions;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'core' | 'management' | 'system';
  critical?: boolean;
}

const systemComponents: SystemComponent[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'View system overview and statistics',
    icon: <Database className="h-4 w-4" />,
    category: 'core',
  },
  {
    key: 'pos',
    label: 'Point of Sale',
    description: 'Process sales and transactions',
    icon: <Tag className="h-4 w-4" />,
    category: 'core',
    critical: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    description: 'View and manage sales records',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'core',
  },
  {
    key: 'cashiers',
    label: 'Cashiers',
    description: 'Manage cashier sessions and reports',
    icon: <Users className="h-4 w-4" />,
    category: 'management',
  },
  {
    key: 'repairs',
    label: 'Repair Jobs',
    description: 'Create and track repair orders',
    icon: <FileText className="h-4 w-4" />,
    category: 'core',
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Manage customer information',
    icon: <UserIcon className="h-4 w-4" />,
    category: 'management',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Manage products and stock',
    icon: <Package className="h-4 w-4" />,
    category: 'management',
  },
  {
    key: 'stockTaking',
    label: 'Stock Taking',
    description: 'Perform inventory counts and audits',
    icon: <ClipboardCheck className="h-4 w-4" />,
    category: 'management',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    description: 'Schedule appointments and events',
    icon: <CalendarIcon className="h-4 w-4" />,
    category: 'core',
  },
  {
    key: 'history',
    label: 'History',
    description: 'View system activity logs',
    icon: <HistoryIcon className="h-4 w-4" />,
    category: 'system',
  },
  {
    key: 'search',
    label: 'Search',
    description: 'Global search functionality',
    icon: <SearchIcon className="h-4 w-4" />,
    category: 'system',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Configure system preferences',
    icon: <SettingsIcon className="h-4 w-4" />,
    category: 'system',
  },
  {
    key: 'userManagement',
    label: 'User Management',
    description: 'Manage users and permissions',
    icon: <UserCog className="h-4 w-4" />,
    category: 'system',
    critical: true,
  },
  {
    key: 'subscription',
    label: 'Subscription',
    description: 'Manage billing and subscription',
    icon: <CreditCard className="h-4 w-4" />,
    category: 'system',
  },
];

const PermissionManagementDialog: React.FC<PermissionManagementDialogProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      // Initialize with user's current permissions or default all to true
      setPermissions(user.permissions || {
        dashboard: true,
        pos: true,
        sales: true,
        cashiers: false,
        repairs: true,
        customers: true,
        inventory: false,
        stockTaking: false,
        calendar: true,
        history: false,
        search: true,
        settings: false,
        userManagement: false,
        subscription: false,
      });
      setHasChanges(false);
    }
  }, [user]);

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const toggleAll = (enable: boolean) => {
    const newPermissions: UserPermissions = {};
    systemComponents.forEach((component) => {
      newPermissions[component.key] = enable;
    });
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await onSave(user.id, permissions);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryComponents = (category: string) => {
    return systemComponents.filter((c) => c.category === category);
  };

  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = systemComponents.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-blue-600" />
            Access Control & Permissions
          </DialogTitle>
          <DialogDescription>
            Manage system component access for {user?.firstName} {user?.lastName}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Components Enabled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enabledCount} / {totalCount}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(true)}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Enable All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(false)}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Disable All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Alert */}
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Changes take effect immediately. Users will see only the components they have access to.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Core Components */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              Core Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getCategoryComponents('core').map((component) => (
                <div
                  key={component.key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    permissions[component.key]
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          permissions[component.key]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {component.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={component.key}
                            className="font-semibold text-gray-900 cursor-pointer"
                          >
                            {component.label}
                          </Label>
                          {component.critical && (
                            <Badge className="bg-red-100 text-red-700 text-xs">Critical</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{component.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={component.key}
                      checked={permissions[component.key]}
                      onCheckedChange={() => togglePermission(component.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Management Components */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Management & Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getCategoryComponents('management').map((component) => (
                <div
                  key={component.key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    permissions[component.key]
                      ? 'border-purple-200 bg-purple-50/50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          permissions[component.key]
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {component.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={component.key}
                          className="font-semibold text-gray-900 cursor-pointer"
                        >
                          {component.label}
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">{component.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={component.key}
                      checked={permissions[component.key]}
                      onCheckedChange={() => togglePermission(component.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Components */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-gray-600" />
              System & Administration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getCategoryComponents('system').map((component) => (
                <div
                  key={component.key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    permissions[component.key]
                      ? 'border-blue-200 bg-blue-50/50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          permissions[component.key]
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {component.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={component.key}
                            className="font-semibold text-gray-900 cursor-pointer"
                          >
                            {component.label}
                          </Label>
                          {component.critical && (
                            <Badge className="bg-red-100 text-red-700 text-xs">Admin Only</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{component.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={component.key}
                      checked={permissions[component.key]}
                      onCheckedChange={() => togglePermission(component.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {hasChanges && (
                <Badge className="bg-amber-100 text-amber-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading || !hasChanges} className="bg-blue-600 hover:bg-blue-700">
                <Shield className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionManagementDialog;
