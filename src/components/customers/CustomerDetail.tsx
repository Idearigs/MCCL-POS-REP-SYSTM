
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, MapPin, Phone, ShoppingBag, User, ExternalLink, Eye, Wrench, Award, DollarSign, TrendingUp, CreditCard, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ConsentForm from '@/components/gdpr/ConsentForm';
import CustomerPurchaseHistory from './CustomerPurchaseHistory';
import { Customer } from '@/contexts/CustomerContext';
import { repairService } from '@/services/repairService';
import { toast } from 'sonner';

interface CustomerDetailProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Customer>) => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({ 
  customer, 
  isOpen,
  onClose,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [customerRepairs, setCustomerRepairs] = useState<any[]>([]);
  const [loadingRepairs, setLoadingRepairs] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  // Load customer repairs when dialog opens
  useEffect(() => {
    if (isOpen && customer.id) {
      loadCustomerRepairs();
    }
  }, [isOpen, customer.id]);

  const loadCustomerRepairs = async () => {
    try {
      setLoadingRepairs(true);
      setRepairError(null);
      
      // Get all repairs and filter by customer ID
      const allRepairs = await repairService.getRepairs();
      const customerRepairsList = allRepairs.data?.filter(repair => repair.customerId === customer.id) || [];
      
      setCustomerRepairs(customerRepairsList);
      console.log(`✅ Loaded ${customerRepairsList.length} repairs for customer ${customer.name}`, customerRepairsList);
    } catch (error: any) {
      console.error('Failed to load customer repairs:', error);
      setRepairError(error.message || 'Failed to load repairs');
    } finally {
      setLoadingRepairs(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-500 text-white';
      case 'READY_FOR_COLLECTION':
        return 'bg-green-400 text-white';
      case 'COLLECTED':
        return 'bg-green-600 text-white';
      case 'IN_PROGRESS':
        return 'bg-blue-500 text-white';
      case 'APPROVED':
        return 'bg-blue-400 text-white';
      case 'QUOTED':
        return 'bg-purple-500 text-white';
      case 'RECEIVED':
        return 'bg-amber-500 text-white';
      case 'CANCELLED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'READY_FOR_COLLECTION':
        return 'Ready for Collection';
      case 'IN_PROGRESS':
        return 'In Progress';
      default:
        return status?.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
    }
  };

  const handleConsentUpdate = async (consents: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    dataProcessing: boolean;
  }) => {
    try {
      console.log('Updating customer preferences:', { customerId: customer.id, consents });
      // Update the customer's marketing consent preferences
      await onUpdate(customer.id, {
        marketingConsent: {
          email: consents.email,
          sms: consents.sms,
          phone: consents.phone
        }
      });
      console.log('Customer preferences updated successfully');
    } catch (error) {
      console.error('Failed to update customer preferences:', error);
      throw error; // Re-throw to let the parent component handle the error display
    }
  };

  const getGroupBadgeStyle = (group: string) => {
    switch (group) {
      case 'VIP':
        return 'bg-amber-500 text-white border-0';
      case 'WHOLESALE':
        return 'bg-blue-500 text-white border-0';
      case 'CORPORATE':
        return 'bg-purple-500 text-white border-0';
      case 'TRADE':
        return 'bg-green-500 text-white border-0';
      case 'REGULAR':
        return 'bg-indigo-500 text-white border-0';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border shadow-lg rounded-xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <User size={24} className="text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {customer.name}
                <Badge className={`${getGroupBadgeStyle(customer.customerGroup || 'RETAIL')} text-xs`}>
                  {customer.customerGroup === 'VIP' && <Star size={12} className="mr-1" />}
                  {customer.customerGroup || 'RETAIL'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-normal mt-1">
                <Calendar size={12} />
                <span>Member since {customer.since || 'Unknown'}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="w-full grid grid-cols-3 mb-6 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="rounded data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="history" className="rounded data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">Purchase & Repairs</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Contact Information Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Mail size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Email Address</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{customer.email || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Phone size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                      <p className="text-sm font-medium text-gray-800">{customer.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <MapPin size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Address</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{customer.address || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Wrench size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Repair Jobs</p>
                      <p className="text-sm font-medium text-gray-800">{customerRepairs.length} repairs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Credit & Financial Info */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard size={20} className="text-gray-600" />
                  Credit & Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Credit Limit</span>
                      <TrendingUp size={16} className="text-gray-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-800">£{(customer.creditLimit || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Outstanding Balance</span>
                      <DollarSign size={16} className="text-gray-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-800">£{(customer.outstandingBalance || 0).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Marketing Preferences */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Mail size={20} className="text-gray-600" />
                  Marketing Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg border bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Email</span>
                    </div>
                    <Badge variant={customer.marketingConsent?.email ? "default" : "secondary"}>
                      {customer.marketingConsent?.email ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">SMS</span>
                    </div>
                    <Badge variant={customer.marketingConsent?.sms ? "default" : "secondary"}>
                      {customer.marketingConsent?.sms ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Phone Call</span>
                    </div>
                    <Badge variant={customer.marketingConsent?.phone ? "default" : "secondary"}>
                      {customer.marketingConsent?.phone ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Comprehensive Purchase History Component */}
            <CustomerPurchaseHistory
              customerId={customer.id}
              customerName={`${customer.firstName} ${customer.lastName}`}
            />

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <Wrench size={16} className="text-purple-500" />
                </div>
                Repair History
                {loadingRepairs && (
                  <div className="animate-spin ml-2">
                    <svg className="h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </h3>
              
              {repairError ? (
                <div className="flex items-center justify-center h-24 border border-red-100 rounded-xl bg-red-50/50 backdrop-blur-sm">
                  <p className="text-red-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-300">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    Failed to load repair history: {repairError}
                  </p>
                </div>
              ) : customerRepairs.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-gray-700">Repair #</TableHead>
                        <TableHead className="text-gray-700">Item</TableHead>
                        <TableHead className="text-gray-700">Status</TableHead>
                        <TableHead className="text-gray-700">Cost</TableHead>
                        <TableHead className="text-gray-700">Created</TableHead>
                        <TableHead className="text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerRepairs.map((repair) => (
                        <TableRow key={repair.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="text-gray-700 font-medium text-sm font-mono">
                            {repair.repairNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-700 font-medium">{repair.itemDescription}</p>
                              {repair.problemDescription && (
                                <p className="text-gray-500 text-xs mt-1">{repair.problemDescription}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(repair.status)} rounded-full px-2 py-0.5 text-xs font-medium`}>
                              {getStatusText(repair.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700">
                            <div className="text-sm">
                              {repair.totalCost > 0 ? (
                                <span className="font-medium">£{repair.totalCost.toFixed(2)}</span>
                              ) : repair.estimatedCost > 0 ? (
                                <span className="text-gray-500">Est: £{repair.estimatedCost.toFixed(2)}</span>
                              ) : (
                                <span className="text-gray-400">TBC</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {formatDate(repair.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Open repair detail view
                                toast.info(`Opening repair ${repair.repairNumber}`);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : !loadingRepairs ? (
                <div className="flex items-center justify-center h-24 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
                  <p className="text-gray-400 flex items-center gap-2">
                    <Wrench size={16} className="text-gray-300" />
                    No repair history available
                  </p>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Update Consent Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ConsentForm
                  initialConsents={{
                    email: customer.marketingConsent?.email || false,
                    sms: customer.marketingConsent?.sms || false,
                    phone: customer.marketingConsent?.phone || false,
                    dataProcessing: true, // Assume true for existing customers
                  }}
                  onSubmit={handleConsentUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetail;
