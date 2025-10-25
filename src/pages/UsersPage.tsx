import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  Plus,
  Edit,
  Key,
  UserCheck,
  UserX,
  Search,
  Shield,
  Mail,
  Calendar,
  Filter,
  AlertCircle,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { User, UserRole, CreateUserDto, UpdateUserDto } from '../types/user';

// Optimized: Memoized User Card Component
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onChangeRole: (user: User) => void;
  currentUserId: string;
}

const UserCard = memo<UserCardProps>(({ user, onEdit, onResetPassword, onToggleStatus, onChangeRole, currentUserId }) => {
  const getRoleBadgeColor = useCallback((role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserRole.STAFF:
        return 'bg-green-100 text-green-800 border-green-200';
      case UserRole.READONLY:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getRoleIcon = useCallback((role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
      case UserRole.MANAGER:
        return <Shield className="h-3 w-3" />;
      case UserRole.STAFF:
      case UserRole.READONLY:
        return <UsersIcon className="h-3 w-3" />;
      default:
        return <UsersIcon className="h-3 w-3" />;
    }
  }, []);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {user.firstName.charAt(0)}
          {user.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">
              {user.firstName} {user.lastName}
            </h3>
            <Badge className={getRoleBadgeColor(user.role)}>
              <span className="flex items-center gap-1">
                {getRoleIcon(user.role)}
                {user.role}
              </span>
            </Badge>
            {user.isActive ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />
              {user.email}
            </span>
            {user.lastLogin && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                Last: {new Date(user.lastLogin).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {/* Change Role button - only show if not the current user */}
        {user.id !== currentUserId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChangeRole(user)}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Shield className="h-4 w-4 mr-1" />
            Role
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onResetPassword(user)}>
          <Key className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Button
          variant={user.isActive ? 'destructive' : 'default'}
          size="sm"
          onClick={() => onToggleStatus(user)}
        >
          {user.isActive ? (
            <>
              <UserX className="h-4 w-4 mr-1" />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-1" />
              Activate
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

UserCard.displayName = 'UserCard';

// Optimized: Stats Card Component
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

const StatsCard = memo<StatsCardProps>(({ title, value, icon }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </div>
    </CardContent>
  </Card>
));

StatsCard.displayName = 'StatsCard';

export const UsersPage: React.FC = () => {
  const { toast } = useToast();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Role-based access control: Only OWNER and MANAGER can access this page
  useEffect(() => {
    if (!auth.user || (auth.user.role !== 'OWNER' && auth.user.role !== 'MANAGER')) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [auth.user, navigate, toast]);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STAFF);

  // Form states
  const [formData, setFormData] = useState<CreateUserDto>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.STAFF,
  });
  const [newPassword, setNewPassword] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers();
      setUsers(response.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Optimized: Memoized filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch =
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower);

      const matchesRole = filterRole === 'all' || user.role === filterRole;

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && user.isActive) ||
        (filterStatus === 'inactive' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, debouncedSearch, filterRole, filterStatus]);

  // Optimized: Memoized statistics
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    managers: users.filter((u) => u.role === UserRole.MANAGER || u.role === UserRole.OWNER).length,
    staff: users.filter((u) => u.role === UserRole.STAFF).length,
  }), [users]);

  // Optimized: Stable callback functions
  const handleCreateUser = useCallback(async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Backend requires minimum 8 characters
    if (formData.password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await userService.createUser(formData);
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setIsCreateDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: UserRole.STAFF,
      });
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Create user error:', error);
    } finally {
      setLoading(false);
    }
  }, [formData, toast, fetchUsers]);

  const handleUpdateUser = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const updateData: UpdateUserDto = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      };
      await userService.updateUser(selectedUser.id, updateData);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, formData, toast, fetchUsers]);

  const handleResetPassword = useCallback(async () => {
    if (!selectedUser || !newPassword) {
      toast({
        title: 'Error',
        description: 'Please enter a new password',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await userService.resetPassword(selectedUser.id, newPassword);
      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });
      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, newPassword, toast]);

  const handleToggleUserStatus = useCallback(async (user: User) => {
    try {
      setLoading(true);
      if (user.isActive) {
        await userService.deactivateUser(user.id);
        toast({
          title: 'Success',
          description: 'User deactivated successfully',
        });
      } else {
        await userService.activateUser(user.id);
        toast({
          title: 'Success',
          description: 'User activated successfully',
        });
      }
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user status',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUsers]);

  const openEditDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setIsEditDialogOpen(true);
  }, []);

  const openPasswordDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
  }, []);

  const openRoleDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsRoleDialogOpen(true);
  }, []);

  const handleChangeRole = useCallback(async () => {
    if (!selectedUser) return;

    // Prevent changing own role
    if (selectedUser.id === auth.user?.id) {
      toast({
        title: 'Error',
        description: 'You cannot change your own role',
        variant: 'destructive',
      });
      return;
    }

    // Confirm role change
    if (selectedRole === selectedUser.role) {
      toast({
        title: 'Info',
        description: 'Role is already set to this value',
      });
      return;
    }

    try {
      setLoading(true);
      await userService.updateUser(selectedUser.id, { role: selectedRole });
      toast({
        title: 'Success',
        description: `Role changed to ${selectedRole} successfully`,
      });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to change role';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Change role error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, selectedRole, auth.user?.id, toast, fetchUsers]);

  // Show access denied message for unauthorized users
  if (!auth.user || (auth.user.role !== 'OWNER' && auth.user.role !== 'MANAGER')) {
    return (
      <MainLayout pageTitle="Access Denied">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access User Management. This page is only available to Owners and Managers.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="User Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UsersIcon className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage users, roles, and permissions for your store
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>

        {/* Role Management Info Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-blue-600" />
              Role Permissions
            </CardTitle>
            <CardDescription>Understanding user roles and their access levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-purple-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-purple-800">Owner</h3>
                </div>
                <p className="text-xs text-gray-600">Full system access including user management, settings, and all features</p>
              </div>
              <div className="p-4 rounded-lg border border-blue-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Manager</h3>
                </div>
                <p className="text-xs text-gray-600">Can manage users, approve stock takes, and access most features</p>
              </div>
              <div className="p-4 rounded-lg border border-green-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <UsersIcon className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold text-green-800">Staff</h3>
                </div>
                <p className="text-xs text-gray-600">Standard POS access for sales, repairs, and customer management</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <UsersIcon className="h-4 w-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">Read Only</h3>
                </div>
                <p className="text-xs text-gray-600">View-only access to reports and data, no modifications allowed</p>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Stats Cards - Memoized */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.total}
          icon={<UsersIcon className="h-8 w-8 text-blue-600" />}
        />
        <StatsCard
          title="Active Users"
          value={stats.active}
          icon={<UserCheck className="h-8 w-8 text-green-600" />}
        />
        <StatsCard
          title="Managers"
          value={stats.managers}
          icon={<Shield className="h-8 w-8 text-purple-600" />}
        />
        <StatsCard
          title="Staff"
          value={stats.staff}
          icon={<UsersIcon className="h-8 w-8 text-gray-600" />}
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={UserRole.OWNER}>Owner</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                  <SelectItem value={UserRole.STAFF}>Staff</SelectItem>
                  <SelectItem value={UserRole.READONLY}>Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>All users in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">No users found</div>
          )}

          {!loading && filteredUsers.length > 0 && (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onEdit={openEditDialog}
                  onResetPassword={openPasswordDialog}
                  onToggleStatus={handleToggleUserStatus}
                  onChangeRole={openRoleDialog}
                  currentUserId={auth.user?.id || ''}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 8 characters"
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.OWNER}>Owner - Full system access</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>
                    Manager - Can manage users and approve actions
                  </SelectItem>
                  <SelectItem value={UserRole.STAFF}>Staff - Standard POS access</SelectItem>
                  <SelectItem value={UserRole.READONLY}>Read Only - View access only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={loading}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={formData.email} disabled />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.OWNER}>Owner</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                  <SelectItem value={UserRole.STAFF}>Staff</SelectItem>
                  <SelectItem value={UserRole.READONLY}>Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={loading}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters. The user will need to use this password on their next login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={loading}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Role Display */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Current Role:</p>
              <p className="text-lg font-semibold text-gray-900">{selectedUser?.role}</p>
            </div>

            {/* New Role Selection */}
            <div>
              <Label htmlFor="newRole">Select New Role *</Label>
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.OWNER}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="font-semibold">Owner</p>
                        <p className="text-xs text-gray-500">Full system access</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.MANAGER}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-semibold">Manager</p>
                        <p className="text-xs text-gray-500">Manage users & approvals</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.STAFF}>
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-semibold">Staff</p>
                        <p className="text-xs text-gray-500">Standard POS access</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.READONLY}>
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-semibold">Read Only</p>
                        <p className="text-xs text-gray-500">View-only access</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                This will immediately change the user's permissions.
              </p>
            </div>

            {/* Warning Alert */}
            {selectedUser && selectedUser.id === auth.user?.id && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You cannot change your own role. Ask another admin to change it.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={loading || selectedUser?.id === auth.user?.id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
};
