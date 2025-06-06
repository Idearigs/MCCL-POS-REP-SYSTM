
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter } from 'lucide-react';
import CustomerCard from '@/components/customers/CustomerCard';
import CustomerDetail from '@/components/customers/CustomerDetail';
import AddCustomerForm from '@/components/customers/AddCustomerForm';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCustomers, Customer } from '@/contexts/CustomerContext';



const CustomersPage = () => {
  const { customers, updateCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const { toast } = useToast();

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

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

  return (
    <MainLayout pageTitle="Customers">
      <div className="container mx-auto px-4">
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

        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCustomers.map((customer) => (
              <CustomerCard 
                key={customer.id}
                id={customer.id}
                name={customer.name}
                email={customer.email}
                phone={customer.phone}
                since={customer.since}
                marketingConsent={customer.marketingConsent}
                onClick={handleCustomerClick}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
            <p className="text-gray-400 flex flex-col items-center">
              <Search size={24} className="mb-2 text-gray-300" />
              No customers found matching your search.
            </p>
          </div>
        )}

        {selectedCustomer && (
          <CustomerDetail 
            customer={selectedCustomer}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onUpdate={(id, updates) => {
              updateCustomer(id, updates);
              toast({
                title: "Customer Updated",
                description: `Customer ${id} has been updated successfully.`
              });
              setIsDetailOpen(false);
            }}
          />
        )}

        <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
          {isAddingCustomer && (
            <AddCustomerForm 
              onClose={() => setIsAddingCustomer(false)}
              onSuccess={(customer) => {
                // Select the newly created customer
                setSelectedCustomer(customer);
                setIsDetailOpen(true);
                setSearchQuery('');
                toast({
                  title: "Customer created",
                  description: `${customer.name} has been added successfully.`
                });
              }}
            />
          )}
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CustomersPage;
