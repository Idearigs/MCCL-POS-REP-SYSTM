import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Package, CreditCard, Activity, Settings,
  Plus, TrendingUp, Users, Globe, ExternalLink, ChevronRight,
  Server, Zap, CheckCircle, AlertCircle, Clock, Search,
  Eye, MoreHorizontal, ArrowUpRight, DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Toaster, toast } from 'sonner';
import {
  customerProfilesApi,
  subscriptionsApi,
  subdomainApi
} from '../services/api';

// Types
interface CustomerProfile {
  id: string;
  businessName: string;
  businessEmail: string;
  subdomain: string;
  status: string;
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
  };
  _count?: {
    customerUsers: number;
  };
}

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  weeklyGrowth: number;
  mrr: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  uptime: number;
}

interface ActivityLog {
  id: string;
  tenant: string;
  action: string;
  timestamp: Date;
}

const MainFrameDashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'tenants' | 'features' | 'billing' | 'health' | 'settings'>('overview');
  const [tenants, setTenants] = useState<CustomerProfile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    activeTenants: 0,
    weeklyGrowth: 0,
    mrr: 0,
    systemStatus: 'healthy',
    uptime: 99.9
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTenant, setShowCreateTenant] = useState(false);

  // Create Tenant Form State
  const [newTenant, setNewTenant] = useState({
    businessName: '',
    businessEmail: '',
    subdomain: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    plan: 'PROFESSIONAL'
  });
  const [subdomainValid, setSubdomainValid] = useState<boolean | null>(null);
  const [subdomainChecking, setSubdomainChecking] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [tenantsResponse, statsResponse] = await Promise.all([
        customerProfilesApi.getAll().then(r => r.data.data || r.data || []),
        customerProfilesApi.getStats().then(r => r.data).catch(() => ({}))
      ]);

      setTenants(tenantsResponse);

      // Calculate stats
      const activeTenants = tenantsResponse.filter((t: CustomerProfile) => t.status === 'ACTIVE').length;
      const weekOld = new Date();
      weekOld.setDate(weekOld.getDate() - 7);
      const weeklyNew = tenantsResponse.filter((t: CustomerProfile) =>
        new Date(t.createdAt) > weekOld
      ).length;

      setStats({
        totalTenants: tenantsResponse.length,
        activeTenants,
        weeklyGrowth: weeklyNew,
        mrr: statsResponse.mrr || 0,
        systemStatus: 'healthy',
        uptime: 99.9
      });

      // Generate activity logs
      const logs: ActivityLog[] = tenantsResponse.slice(0, 5).map((t: CustomerProfile, i: number) => ({
        id: t.id,
        tenant: t.businessName,
        action: i % 3 === 0 ? 'logged in' : i % 3 === 1 ? 'added user' : 'processed sale',
        timestamp: new Date(Date.now() - Math.random() * 3600000)
      }));
      setActivityLogs(logs);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const validateSubdomain = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainValid(null);
      return;
    }
    setSubdomainChecking(true);
    try {
      const result = await subdomainApi.validate(subdomain);
      setSubdomainValid(result.data.available);
    } catch {
      setSubdomainValid(false);
    } finally {
      setSubdomainChecking(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewTenant({ ...newTenant, subdomain: sanitized });
    validateSubdomain(sanitized);
  };

  const createTenant = async () => {
    if (!newTenant.businessName || !newTenant.subdomain || !newTenant.businessEmail) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!newTenant.contactFirstName || !newTenant.contactLastName || !newTenant.contactEmail) {
      toast.error('Please fill in contact information');
      return;
    }
    if (!subdomainValid) {
      toast.error('Please enter a valid subdomain');
      return;
    }

    try {
      await customerProfilesApi.create(newTenant);
      toast.success('Tenant created successfully');
      setShowCreateTenant(false);
      setNewTenant({
        businessName: '',
        businessEmail: '',
        subdomain: '',
        contactFirstName: '',
        contactLastName: '',
        contactEmail: '',
        contactPhone: '',
        plan: 'PROFESSIONAL'
      });
      setSubdomainValid(null);
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.businessEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'features', label: 'Features', icon: Package },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 overflow-hidden">
      <Toaster position="top-right" />

      {/* Glassmorphic Sidebar */}
      <aside className="w-64 backdrop-blur-xl bg-white/70 border-r border-gray-200/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">TruedeskPOS</h1>
              <p className="text-[10px] text-gray-400 tracking-wide">MAINFRAME</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-600 hover:bg-gray-100/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-600">
                {admin?.firstName?.[0]}{admin?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {admin?.firstName} {admin?.lastName}
              </p>
              <p className="text-[10px] text-gray-500">{admin?.role}</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full text-xs text-red-600 hover:bg-red-50"
          >
            Sign Out
          </Button>
          <p className="text-[10px] text-gray-400 text-center mt-3">Powered by MCCL</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Overview Section */}
          {activeView === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Page Header */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">Overview</h2>
                <p className="text-sm text-gray-500">Monitor and manage all tenant instances</p>
              </div>

              {/* Bento Grid - Row 1: Stats */}
              <div className="grid grid-cols-3 gap-6">
                {/* Total Tenants */}
                <motion.div
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  className="bg-white rounded-3xl p-6 border border-gray-200/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-semibold text-green-600">+{stats.weeklyGrowth}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-gray-900 mb-1">{stats.totalTenants}</p>
                    <p className="text-sm font-medium text-gray-500">Total Tenants</p>
                    <p className="text-xs text-gray-400 mt-2">{stats.activeTenants} active this week</p>
                  </div>
                </motion.div>

                {/* MRR */}
                <motion.div
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  className="bg-white rounded-3xl p-6 border border-gray-200/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100">
                      <ArrowUpRight className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-600">12%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-gray-900 mb-1">£{stats.mrr.toLocaleString()}</p>
                    <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                    <p className="text-xs text-gray-400 mt-2">MRR across all tenants</p>
                  </div>
                </motion.div>

                {/* System Status */}
                <motion.div
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-semibold">Live</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-4xl font-bold mb-1">{stats.uptime}%</p>
                    <p className="text-sm font-medium text-white/90">System Uptime</p>
                    <p className="text-xs text-white/70 mt-2">All systems operational</p>
                  </div>
                </motion.div>
              </div>

              {/* Bento Grid - Row 2: Activity & Provision */}
              <div className="grid grid-cols-3 gap-6">
                {/* Activity Stream (2/3 width) */}
                <motion.div
                  whileHover={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  className="col-span-2 bg-white rounded-3xl p-6 border border-gray-200/50"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-bold">{log.tenant}</span> {log.action}
                          </p>
                          <p className="text-xs text-gray-400">
                            {log.timestamp.toLocaleTimeString()} • Just now
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Provision Tenant Button (1/3 width) */}
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 25px 50px -12px rgba(59,130,246,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateTenant(true)}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 transition-all"
                >
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">New Tenant</h3>
                    <p className="text-sm text-white/80">Provision a new customer instance</p>
                  </div>
                </motion.button>
              </div>

              {/* Tenant List Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Active Tenants</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveView('tenants')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="bg-white rounded-3xl border border-gray-200/50 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {tenants.slice(0, 5).map((tenant) => (
                      <motion.div
                        key={tenant.id}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(249,250,251,1)' }}
                        className="flex items-center justify-between p-4 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                            {tenant.businessName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{tenant.businessName}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Globe className="w-3 h-3" />
                              {tenant.subdomain}.truedesk.co.uk
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : ''}
                          >
                            {tenant.status}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`https://${tenant.subdomain}.truedesk.co.uk`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tenants Section */}
          {activeView === 'tenants' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-1">Tenants</h2>
                  <p className="text-sm text-gray-500">Manage all customer instances</p>
                </div>
                <Button
                  onClick={() => setShowCreateTenant(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Tenant
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name, subdomain, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-6 rounded-2xl border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Premium Data Table */}
              <div className="bg-white rounded-3xl border border-gray-200/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Subdomain
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTenants.map((tenant) => (
                      <motion.tr
                        key={tenant.id}
                        whileHover={{ scale: 1.01 }}
                        className="transition-all hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/30">
                              {tenant.businessName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{tenant.businessName}</p>
                              <p className="text-xs text-gray-500">{tenant.businessEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`https://${tenant.subdomain}.truedesk.co.uk`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                          >
                            {tenant.subdomain}.truedesk.co.uk
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                tenant.status === 'ACTIVE'
                                  ? 'bg-green-500'
                                  : tenant.status === 'SUSPENDED'
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500'
                              }`}
                            />
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                tenant.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-700'
                                  : tenant.status === 'SUSPENDED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {tenant.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-700">
                            {tenant.subscription?.plan || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{tenant._count?.customerUsers || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Placeholder for other views */}
          {activeView !== 'overview' && activeView !== 'tenants' && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-sm text-gray-500">This section is under development</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Provision New Tenant</DialogTitle>
            <p className="text-sm text-gray-500">Create a new customer instance with dedicated database</p>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Business Information */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">Business Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Business Name *</Label>
                  <Input
                    placeholder="B-House Jewelry Ltd"
                    value={newTenant.businessName}
                    onChange={(e) => setNewTenant({ ...newTenant, businessName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Business Email *</Label>
                  <Input
                    type="email"
                    placeholder="admin@bhouse.com"
                    value={newTenant.businessEmail}
                    onChange={(e) => setNewTenant({ ...newTenant, businessEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Subdomain */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">Subdomain Configuration</h4>
              <div>
                <Label>Subdomain *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    placeholder="bhouse"
                    value={newTenant.subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    className={
                      subdomainValid === false
                        ? 'border-red-500'
                        : subdomainValid === true
                        ? 'border-green-500'
                        : ''
                    }
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">.truedesk.co.uk</span>
                </div>
                {subdomainChecking && (
                  <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
                )}
                {subdomainValid === true && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Subdomain available
                  </p>
                )}
                {subdomainValid === false && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Subdomain not available
                  </p>
                )}
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">Primary Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    placeholder="John"
                    value={newTenant.contactFirstName}
                    onChange={(e) => setNewTenant({ ...newTenant, contactFirstName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Doe"
                    value={newTenant.contactLastName}
                    onChange={(e) => setNewTenant({ ...newTenant, contactLastName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    placeholder="john.doe@bhouse.com"
                    value={newTenant.contactEmail}
                    onChange={(e) => setNewTenant({ ...newTenant, contactEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+44 20 1234 5678"
                    value={newTenant.contactPhone}
                    onChange={(e) => setNewTenant({ ...newTenant, contactPhone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Subscription Plan */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">Subscription Plan</h4>
              <Select
                value={newTenant.plan}
                onValueChange={(value) => setNewTenant({ ...newTenant, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Starter - £49/month</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional - £99/month</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise - £199/month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowCreateTenant(false)}>
              Cancel
            </Button>
            <Button
              onClick={createTenant}
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Tenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainFrameDashboard;
