import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Building2, Users, Package, CreditCard, Bug, Lightbulb, Settings, Plus, Search,
  MoreVertical, ExternalLink, Eye, Edit, Trash2, Download, RefreshCw, Check, X,
  TrendingUp, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2, Globe, Key,
  ChevronRight, Activity, DollarSign, UserPlus, Mail
} from 'lucide-react';
import {
  customerProfilesApi, customerUsersApi, featuresApi, subscriptionsApi,
  bugReportsApi, featureRequestsApi, subdomainApi, credentialsApi,
  CustomerProfile, CustomerUser, Feature, BugReport, FeatureRequest
} from '@/services/mainframeService';

// Stats Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, change, icon, trend }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {change}
            </p>
          )}
        </div>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, { color: string; icon: React.ReactNode }> = {
    ACTIVE: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
    SUSPENDED: { color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="h-3 w-3" /> },
    CANCELLED: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
    OPEN: { color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
    IN_PROGRESS: { color: 'bg-purple-100 text-purple-700', icon: <Loader2 className="h-3 w-3" /> },
    RESOLVED: { color: 'bg-green-100 text-green-700', icon: <Check className="h-3 w-3" /> },
    CLOSED: { color: 'bg-gray-100 text-gray-700', icon: <X className="h-3 w-3" /> },
  };
  const variant = variants[status] || { color: 'bg-gray-100 text-gray-700', icon: null };

  return (
    <Badge variant="outline" className={`${variant.color} border-0 gap-1`}>
      {variant.icon}
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};

// Priority Badge Component
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  };
  return <Badge variant="outline" className={`${colors[priority] || colors.MEDIUM} border-0`}>{priority}</Badge>;
};

const MainFramePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [stats, setStats] = useState<any>({ customers: {}, subscriptions: {}, bugs: {} });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [showCreateBug, setShowCreateBug] = useState(false);
  const [showCreateFeatureRequest, setShowCreateFeatureRequest] = useState(false);

  // Form states
  const [newCustomer, setNewCustomer] = useState({
    businessName: '', subdomain: '', email: '', phone: '', address: '', city: '', country: '', plan: 'PROFESSIONAL'
  });
  const [subdomainValid, setSubdomainValid] = useState<boolean | null>(null);
  const [subdomainChecking, setSubdomainChecking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, featuresData, bugsData, requestsData, customerStats, subStats, bugStats] = await Promise.all([
        customerProfilesApi.getAll(),
        featuresApi.getAll(),
        bugReportsApi.getAll(),
        featureRequestsApi.getAll(),
        customerProfilesApi.getStats().catch(() => ({})),
        subscriptionsApi.getStats().catch(() => ({})),
        bugReportsApi.getStats().catch(() => ({})),
      ]);
      setCustomers(customersData);
      setFeatures(featuresData);
      setBugReports(bugsData);
      setFeatureRequests(requestsData);
      setStats({ customers: customerStats, subscriptions: subStats, bugs: bugStats });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
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
      setSubdomainValid(result.isValid);
    } catch {
      setSubdomainValid(false);
    } finally {
      setSubdomainChecking(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewCustomer({ ...newCustomer, subdomain: sanitized });
    validateSubdomain(sanitized);
  };

  const suggestSubdomain = async () => {
    if (!newCustomer.businessName) return;
    try {
      const result = await subdomainApi.suggest(newCustomer.businessName);
      if (result.suggestions?.length > 0) {
        setNewCustomer({ ...newCustomer, subdomain: result.suggestions[0] });
        setSubdomainValid(true);
      }
    } catch (error) {
      console.error('Error suggesting subdomain:', error);
    }
  };

  const createCustomer = async () => {
    if (!newCustomer.businessName || !newCustomer.subdomain || !newCustomer.email) {
      toast.error('Please fill in required fields');
      return;
    }
    if (!subdomainValid) {
      toast.error('Please enter a valid subdomain');
      return;
    }
    try {
      await customerProfilesApi.create(newCustomer);
      toast.success('Customer created successfully');
      setShowCreateCustomer(false);
      setNewCustomer({ businessName: '', subdomain: '', email: '', phone: '', address: '', city: '', country: '', plan: 'PROFESSIONAL' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create customer');
    }
  };

  const viewCustomerDetail = async (customer: CustomerProfile) => {
    try {
      const fullData = await customerProfilesApi.getById(customer.id);
      setSelectedCustomer(fullData);
      setShowCustomerDetail(true);
    } catch (error) {
      toast.error('Failed to load customer details');
    }
  };

  const exportCredentials = async (profileId: string, userId: string) => {
    try {
      const result = await credentialsApi.export(profileId, userId);
      // Create and download HTML document
      const blob = new Blob([result.document], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credentials-${result.email}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Credentials exported successfully');
    } catch (error) {
      toast.error('Failed to export credentials');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBugs = bugReports.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = featureRequests.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout pageTitle="MainFrame">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">MainFrame Control Center</h1>
            <p className="text-muted-foreground mt-1">Manage customers, features, and subscriptions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateCustomer(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Customers"
            value={stats.customers?.total || customers.length}
            icon={<Building2 className="h-6 w-6" />}
            change={`${stats.customers?.active || 0} active`}
            trend="up"
          />
          <StatCard
            title="Monthly Revenue"
            value={`£${stats.subscriptions?.mrr || 0}`}
            icon={<DollarSign className="h-6 w-6" />}
            change="MRR"
          />
          <StatCard
            title="Open Bugs"
            value={stats.bugs?.open || bugReports.filter(b => b.status === 'OPEN').length}
            icon={<Bug className="h-6 w-6" />}
            change={`${stats.bugs?.critical || 0} critical`}
            trend={stats.bugs?.critical > 0 ? 'down' : 'neutral'}
          />
          <StatCard
            title="Feature Requests"
            value={featureRequests.length}
            icon={<Lightbulb className="h-6 w-6" />}
            change={`${featureRequests.filter(r => r.status === 'PLANNED').length} planned`}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-auto grid-cols-5">
              <TabsTrigger value="customers" className="gap-2">
                <Building2 className="h-4 w-4" />
                Customers
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-2">
                <Package className="h-4 w-4" />
                Features
              </TabsTrigger>
              <TabsTrigger value="bugs" className="gap-2">
                <Bug className="h-4 w-4" />
                Bugs
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Business</th>
                        <th className="text-left p-4 font-medium">Subdomain</th>
                        <th className="text-left p-4 font-medium">Plan</th>
                        <th className="text-left p-4 font-medium">Users</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Created</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-t hover:bg-muted/25 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{customer.businessName}</p>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{customer.subdomain}.truedesk.co.uk</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{customer.subscription?.plan || 'N/A'}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.users?.length || 0}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={customer.status} />
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => viewCustomerDetail(customer)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`https://${customer.subdomain}.truedesk.co.uk`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            {loading ? 'Loading...' : 'No customers found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid gap-4">
              {features.map((feature) => (
                <Card key={feature.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{feature.name}</h3>
                            {feature.isCore && <Badge variant="outline" className="bg-blue-50">Core</Badge>}
                            {feature.isPremium && <Badge variant="outline" className="bg-amber-50">Premium</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Version</p>
                          <p className="font-mono">{feature.currentVersion || '1.0.0'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="font-semibold">£{feature.monthlyPrice}/mo</p>
                        </div>
                        <StatusBadge status={feature.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {features.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No features configured</p>
                    <Button variant="outline" className="mt-4" onClick={() => featuresApi.seedDefaults()}>
                      Seed Default Features
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Bug Reports Tab */}
          <TabsContent value="bugs" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateBug(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Report Bug
              </Button>
            </div>
            <div className="space-y-3">
              {filteredBugs.map((bug) => (
                <Card key={bug.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          bug.priority === 'CRITICAL' ? 'bg-red-100' :
                          bug.priority === 'HIGH' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          <Bug className={`h-5 w-5 ${
                            bug.priority === 'CRITICAL' ? 'text-red-600' :
                            bug.priority === 'HIGH' ? 'text-orange-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{bug.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{bug.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {bug.feature && <Badge variant="outline">{bug.feature.name}</Badge>}
                            {bug.customerProfile && (
                              <span className="text-xs text-muted-foreground">from {bug.customerProfile.businessName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={bug.priority} />
                        <StatusBadge status={bug.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredBugs.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No bug reports found
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Feature Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateFeatureRequest(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Lightbulb className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{request.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <button
                              className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                              onClick={() => featureRequestsApi.vote(request.id).then(loadData)}
                            >
                              <TrendingUp className="h-4 w-4" />
                              <span>{request.votes} votes</span>
                            </button>
                            {request.customerProfile && (
                              <span className="text-xs text-muted-foreground">from {request.customerProfile.businessName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredRequests.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No feature requests found
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Core MainFrame settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Database Isolation</p>
                      <p className="text-sm text-muted-foreground">Separate database per customer</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Auto Provisioning</p>
                      <p className="text-sm text-muted-foreground">Automatic subdomain setup</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Invoice Generation</p>
                      <p className="text-sm text-muted-foreground">Automatic billing</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => featuresApi.seedDefaults()}>
                    <Package className="h-4 w-4 mr-2" />
                    Seed Default Features
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={loadData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Customer Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Customer Dialog */}
      <Dialog open={showCreateCustomer} onOpenChange={setShowCreateCustomer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>Set up a new customer profile with subdomain and credentials</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                value={newCustomer.businessName}
                onChange={(e) => setNewCustomer({ ...newCustomer, businessName: e.target.value })}
                placeholder="Acme Jewellers"
              />
            </div>
            <div className="space-y-2">
              <Label>Subdomain *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={newCustomer.subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    placeholder="acme"
                    className={subdomainValid === false ? 'border-red-500' : subdomainValid === true ? 'border-green-500' : ''}
                  />
                  {subdomainChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                  {!subdomainChecking && subdomainValid === true && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                  {!subdomainChecking && subdomainValid === false && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />}
                </div>
                <Button variant="outline" onClick={suggestSubdomain} disabled={!newCustomer.businessName}>
                  Suggest
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{newCustomer.subdomain}.truedesk.co.uk</p>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="contact@acmejewellers.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+44 20 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={newCustomer.plan} onValueChange={(v) => setNewCustomer({ ...newCustomer, plan: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter - £29/mo</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional - £79/mo</SelectItem>
                    <SelectItem value="BUSINESS">Business - £199/mo</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise - £499/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="123 High Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  placeholder="London"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={newCustomer.country}
                  onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                  placeholder="United Kingdom"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCustomer(false)}>Cancel</Button>
            <Button onClick={createCustomer} disabled={!subdomainValid}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              {selectedCustomer?.businessName}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Globe className="h-4 w-4" />
                <span className="font-mono">{selectedCustomer?.subdomain}.truedesk.co.uk</span>
                <StatusBadge status={selectedCustomer?.status || 'PENDING'} />
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedCustomer.address || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{selectedCustomer.city || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{selectedCustomer.country || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" asChild>
                    <a href={`https://${selectedCustomer.subdomain}.truedesk.co.uk`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Portal
                    </a>
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.users?.length || 0} of {selectedCustomer.subscription?.maxUsers || 'unlimited'} users
                  </p>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedCustomer.users?.map((user: CustomerUser) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{user.firstName[0]}{user.lastName[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportCredentials(selectedCustomer.id, user.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!selectedCustomer.users || selectedCustomer.users.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">No users yet</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-4 mt-4">
                <div className="space-y-2">
                  {selectedCustomer.features?.map((cf: any) => (
                    <div key={cf.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{cf.feature?.name}</p>
                          <p className="text-sm text-muted-foreground">{cf.feature?.description}</p>
                        </div>
                      </div>
                      <Badge variant={cf.isEnabled ? 'default' : 'secondary'}>
                        {cf.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                  {(!selectedCustomer.features || selectedCustomer.features.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">No features configured</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4 mt-4">
                {selectedCustomer.subscription && (
                  <>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Current Plan</p>
                            <p className="text-2xl font-bold">{selectedCustomer.subscription.plan}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Monthly</p>
                            <p className="text-2xl font-bold">£{selectedCustomer.subscription.basePrice}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">Billing Cycle</p>
                            <p className="font-medium">{selectedCustomer.subscription.billingCycle}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Included Users</p>
                            <p className="font-medium">{selectedCustomer.subscription.includedUsers}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Per Extra User</p>
                            <p className="font-medium">£{selectedCustomer.subscription.perUserPrice}/mo</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button variant="outline" onClick={() => subscriptionsApi.generateInvoice(selectedCustomer.id)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Bug Report Dialog */}
      <Dialog open={showCreateBug} onOpenChange={setShowCreateBug}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a Bug</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Brief description of the issue" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Detailed steps to reproduce..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="MEDIUM">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Feature</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {features.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBug(false)}>Cancel</Button>
            <Button>Submit Bug Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Feature Request Dialog */}
      <Dialog open={showCreateFeatureRequest} onOpenChange={setShowCreateFeatureRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Feature Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Feature name or brief description" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the feature and its benefits..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFeatureRequest(false)}>Cancel</Button>
            <Button>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default MainFramePage;
