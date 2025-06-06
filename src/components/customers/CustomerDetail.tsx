
import React, { useState } from 'react';
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
import { Calendar, Mail, MapPin, Phone, ShoppingBag, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ConsentForm from '@/components/gdpr/ConsentForm';
import { Customer } from '@/contexts/CustomerContext';

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'in-progress':
        return 'bg-blue-500 text-white';
      case 'waiting':
        return 'bg-amber-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const handleConsentUpdate = (consents: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    dataProcessing: boolean;
  }) => {
    // Update the customer's marketing consent preferences
    onUpdate(customer.id, {
      marketingConsent: {
        email: consents.email,
        sms: consents.sms,
        phone: consents.phone
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-lg border border-gray-100 shadow-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-gray-800">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <User size={20} className="text-blue-500" />
            </div>
            {customer.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6 bg-gray-100/50 p-1 rounded-full">
            <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">Purchase & Repairs</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <Card className="border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-800">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-700">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-700">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-gray-700">{customer.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-700">Customer since: {customer.since}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Marketing Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={customer.marketingConsent.email ? "default" : "outline"}>
                    Email {customer.marketingConsent.email ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={customer.marketingConsent.sms ? "default" : "outline"}>
                    SMS {customer.marketingConsent.sms ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={customer.marketingConsent.phone ? "default" : "outline"}>
                    Phone {customer.marketingConsent.phone ? '✓' : '✗'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-800">Customer Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded-lg">
                  <span className="text-gray-700">Total spent:</span>
                  <span className="font-semibold text-gray-800 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">£{customer.totalSpent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50/50 rounded-lg">
                  <span className="text-gray-700">Purchase count:</span>
                  <span className="font-semibold text-gray-800 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">{customer.purchaseHistory.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50/50 rounded-lg">
                  <span className="text-gray-700">Repair jobs:</span>
                  <span className="font-semibold text-gray-800 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">{customer.repairHistory.length}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <ShoppingBag size={16} className="text-blue-500" />
                </div>
                Purchase History
              </h3>
              {customer.purchaseHistory.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-gray-700">Date</TableHead>
                        <TableHead className="text-gray-700">Items</TableHead>
                        <TableHead className="text-right text-gray-700">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.purchaseHistory.map((purchase) => (
                        <TableRow key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="text-gray-700">{formatDate(purchase.date)}</TableCell>
                          <TableCell className="text-gray-700">{purchase.items.join(', ')}</TableCell>
                          <TableCell className="text-right font-medium text-gray-800">£{purchase.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
                  <p className="text-gray-400 flex items-center gap-2">
                    <ShoppingBag size={16} className="text-gray-300" />
                    No purchase history available
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                </div>
                Repair History
              </h3>
              {customer.repairHistory.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-gray-700">Item</TableHead>
                        <TableHead className="text-gray-700">Description</TableHead>
                        <TableHead className="text-gray-700">Status</TableHead>
                        <TableHead className="text-gray-700">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.repairHistory.map((repair) => (
                        <TableRow key={repair.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="text-gray-700 font-medium">{repair.item}</TableCell>
                          <TableCell className="text-gray-700">{repair.description}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(repair.status)} rounded-full px-2 py-0.5 text-xs font-medium`}>
                              {repair.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {repair.completedDate 
                              ? `Completed ${formatDate(repair.completedDate)}`
                              : repair.startDate
                                ? `Started ${formatDate(repair.startDate)}`
                                : 'Not started'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
                  <p className="text-gray-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    No repair history available
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <ConsentForm 
              onSubmit={handleConsentUpdate}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="rounded-full bg-white/80 border border-gray-200 text-gray-800 hover:bg-gray-100 shadow-sm"
          >
            Close
          </Button>
          <Button 
            onClick={() => onUpdate(customer.id, {})}
            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
          >
            Update Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetail;
