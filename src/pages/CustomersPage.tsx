
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Filter, LayoutGrid, List, Trash2, Mail, Phone, MapPin, Eye, Edit, Users, TrendingUp, Award, DollarSign, UserPlus, Star } from 'lucide-react';
import CustomerCard from '@/components/customers/CustomerCard';
import CustomerDetail from '@/components/customers/CustomerDetail';
import AddCustomerForm from '@/components/customers/AddCustomerForm';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useCustomers, Customer } from '@/contexts/CustomerContext';



const CustomersPage = () => {
  const { customers, loading, error, updateCustomer, deleteCustomer, refreshCustomers } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    (customer.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.phone?.includes(searchQuery))
  );

  // Calculate dashboard statistics
  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.customerGroup === 'VIP').length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // Calculate new customers this month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = customers.filter(c => {
    if (!c.createdAt) return false;
    const createdDate = new Date(c.createdAt);
    return createdDate >= firstDayOfMonth;
  }).length;

  // Top customers by total spent
  const topCustomers = [...customers]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5);

  const handleCustomerClick = (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (customer) {
      setSelectedCustomer(customer);
      setIsDetailOpen(true);
    }
  };

  const handleAddCustomer = () => {
    setIsAddingCustomer(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      toast({
        title: "Customer Deleted",
        description: `${customerToDelete.name} has been removed successfully.`
      });
      setCustomerToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete customer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Note: Customers are automatically loaded by CustomerContext on mount
  // No need to manually call refreshCustomers here

  return (
    <MainLayout pageTitle="Customers">
      <div className="container mx-auto px-4">
        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Total Customers</span>
                <Users className="h-4 w-4 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-blue-100 mt-1">
                {newThisMonth > 0 && `+${newThisMonth} this month`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Total Revenue</span>
                <DollarSign className="h-4 w-4 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">£{totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-green-100 mt-1">From all customers</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Avg Customer Value</span>
                <TrendingUp className="h-4 w-4 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">£{avgCustomerValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-purple-100 mt-1">Per customer</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>VIP Customers</span>
                <Award className="h-4 w-4 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{vipCustomers}</div>
              <p className="text-xs text-amber-100 mt-1">
                {totalCustomers > 0 ? `${((vipCustomers / totalCustomers) * 100).toFixed(1)}% of total` : 'No customers yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-navy/70" size={18} />
            <Input 
              className="pl-10 bg-white/90 backdrop-blur-sm border border-navy/10 rounded-xl shadow-sm focus:ring-2 focus:ring-navy/10 focus:border-navy/20 text-navy" 
              placeholder="Search customers by name, email or phone" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/90 rounded-full border border-navy/10 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-l-full ${viewMode === 'grid' ? 'bg-navy text-white hover:bg-navy-dark' : 'text-navy hover:bg-navy/5'}`}
              >
                <LayoutGrid size={16} className="mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`rounded-r-full ${viewMode === 'table' ? 'bg-navy text-white hover:bg-navy-dark' : 'text-navy hover:bg-navy/5'}`}
              >
                <List size={16} className="mr-2" />
                Table
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy shadow-sm"
            >
              <Filter size={16} className="mr-2" />
              Filter
            </Button>
            <Button
              onClick={handleAddCustomer}
              className="rounded-full bg-navy hover:bg-navy-dark text-white shadow-sm"
            >
              <Plus size={16} className="mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading customers...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 border border-red-100 rounded-xl bg-red-50/50 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-red-600 mb-2">Error loading customers</p>
              <Button 
                onClick={refreshCustomers}
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredCustomers.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  id={customer.id}
                  name={customer.name}
                  email={customer.email}
                  phone={customer.phone}
                  since={customer.since}
                  totalSpent={customer.totalSpent}
                  loyaltyPoints={customer.loyaltyPoints}
                  customerGroup={customer.customerGroup}
                  marketingConsent={customer.marketingConsent}
                  onClick={handleCustomerClick}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-navy/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy/5">
                    <TableHead className="font-semibold text-navy">Name</TableHead>
                    <TableHead className="font-semibold text-navy">Email</TableHead>
                    <TableHead className="font-semibold text-navy">Phone</TableHead>
                    <TableHead className="font-semibold text-navy">Location</TableHead>
                    <TableHead className="font-semibold text-navy">Since</TableHead>
                    <TableHead className="font-semibold text-navy text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-navy/5 transition-colors"
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      <TableCell className="font-medium text-navy">
                        {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={14} className="text-navy/50" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No email</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={14} className="text-navy/50" />
                            <span className="text-sm">{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.city || customer.country ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin size={14} className="text-navy/50" />
                            <span className="text-sm">
                              {[customer.city, customer.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {customer.createdAt
                          ? new Date(customer.createdAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(customer.id);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(customer.id);
                            }}
                            className="text-navy hover:text-navy-dark hover:bg-navy/10"
                            title="Edit Customer"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerToDelete(customer);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Customer"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
            <div className="text-center">
              <Search size={24} className="mb-2 text-gray-300" />
              <p className="text-gray-400 mb-2">No customers found {searchQuery ? 'matching your search' : 'yet'}.</p>
              {!searchQuery && (
                <Button 
                  onClick={handleAddCustomer}
                  className="mt-2"
                  size="sm"
                >
                  Add Your First Customer
                </Button>
              )}
            </div>
          </div>
        )}

        {selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onUpdate={async (id, updates) => {
              try {
                const updatedCustomerData = await updateCustomer(id, updates);
                // Refresh the selected customer with updated data from backend
                setSelectedCustomer(updatedCustomerData);
                toast({
                  title: "Customer Updated",
                  description: `Customer preferences have been updated successfully.`
                });
                // Keep the dialog open so user can see the changes were applied
              } catch (error: any) {
                console.error('Failed to update customer:', error);
                toast({
                  title: "Update Failed",
                  description: error.message || "Failed to update customer. Please try again.",
                  variant: "destructive"
                });
              }
            }}
          />
        )}

        <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
          {isAddingCustomer && (
            <AddCustomerForm
              onClose={() => setIsAddingCustomer(false)}
              onSuccess={(customer) => {
                setSearchQuery('');
                toast({
                  title: "Customer created",
                  description: `${customer.name} has been added successfully.`
                });
              }}
            />
          )}
        </Dialog>

        <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-semibold">{customerToDelete?.name}</span>?
                This action cannot be undone and will permanently remove this customer and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default CustomersPage;
