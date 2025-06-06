import React, { useState } from 'react';
import { User, Search, AlertTriangle, History, Edit, Save, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from '@/hooks/use-toast';
import { useCustomers, Customer } from '@/contexts/CustomerContext';
import AddCustomerForm from '@/components/customers/AddCustomerForm';



// Using Customer interface from CustomerContext

interface CustomerInfoProps {
  onSelectCustomer: (customer: Customer | null) => void;
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({ onSelectCustomer }) => {
  const { customers, addCustomer, updateCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyType, setHistoryType] = useState<'purchase' | 'repair'>('purchase');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => {
    const lowerQuery = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.id.toLowerCase().includes(lowerQuery) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(lowerQuery)
    );
  });

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNotes(customer.notes);
    onSelectCustomer(customer);
    setIsSearchOpen(false);
  };

  // Handle saving notes
  const handleSaveNotes = () => {
    if (selectedCustomer) {
      // Update customer notes in the context
      updateCustomer(selectedCustomer.id, { notes });
      
      // Update the selected customer with the new notes
      setSelectedCustomer({ ...selectedCustomer, notes });
      setIsEditingNotes(false);
      
      toast({
        title: "Notes updated",
        description: "Customer notes have been updated successfully.",
        duration: 2000,
      });
    }
  };

  // Handle customer creation success
  const handleCustomerCreated = (customer: Customer) => {
    // Select the newly created customer
    handleSelectCustomer(customer);
    setIsNewCustomerDialogOpen(false);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-200 p-5 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
        <User size={18} className="mr-2 text-gray-600" />
        Customer Information
      </h2>

      {/* Customer Search */}
      <div className="flex gap-2 mb-4">
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1 justify-start text-muted-foreground"
            >
              <Search size={16} className="mr-2" />
              {selectedCustomer ? selectedCustomer.name : "Search customer..."}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Find Customer</DialogTitle>
              <DialogDescription>
                Search by name, ID, phone or email
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  placeholder="Search customers..." 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-md">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      className="p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.id} • {customer.phone}</p>
                      </div>
                      {customer.redFlag && (
                        <Badge variant="destructive" className="flex items-center">
                          <AlertTriangle size={12} className="mr-1" />
                          Flag
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No customers found
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSearchOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-10 p-0">
              <Plus size={16} />
            </Button>
          </DialogTrigger>
          {isNewCustomerDialogOpen && (
            <AddCustomerForm 
              onClose={() => setIsNewCustomerDialogOpen(false)}
              onSuccess={(customer) => {
                // Select the newly created customer
                handleSelectCustomer(customer);
              }}
            />
          )}
        </Dialog>
      </div>

      {/* Customer Details */}
      {selectedCustomer ? (
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{selectedCustomer.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedCustomer.id}</p>
              </div>
              {selectedCustomer.redFlag && (
                <Badge variant="destructive" className="flex items-center">
                  <AlertTriangle size={12} className="mr-1" />
                  Red Notice
                </Badge>
              )}
            </div>
            
            <div className="mt-2 space-y-1 text-sm">
              <p>{selectedCustomer.phone}</p>
              <p>{selectedCustomer.email}</p>
            </div>
            
            {selectedCustomer.redFlag && selectedCustomer.redFlagReason && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {selectedCustomer.redFlagReason}
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Notes</h4>
              {isEditingNotes ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={handleSaveNotes}
                >
                  <Save size={14} />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setIsEditingNotes(true)}
                >
                  <Edit size={14} />
                </Button>
              )}
            </div>
            
            {isEditingNotes ? (
              <Textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground border rounded-md p-2 bg-gray-50 min-h-[70px]">
                {selectedCustomer.notes || "No notes available."}
              </p>
            )}
          </div>
          
          <div className="mt-auto">
            <h4 className="text-sm font-medium mb-2">Customer History</h4>
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
              <div className="flex flex-col gap-2">
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => setHistoryType('purchase')}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <History size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">View Purchase History ({selectedCustomer.purchaseHistory?.length || 0})</span>
                    </div>
                  </Button>
                </DialogTrigger>
                
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => setHistoryType('repair')}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <History size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">View Repair History ({selectedCustomer.repairHistory?.length || 0})</span>
                    </div>
                  </Button>
                </DialogTrigger>
              </div>
              
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {historyType === 'purchase' ? 'Purchase History' : 'Repair History'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCustomer.name} ({selectedCustomer.id})
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  {historyType === 'purchase' ? (
                    selectedCustomer.purchaseHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCustomer.purchaseHistory.map(purchase => (
                          <div key={purchase.id} className="border rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{purchase.id}</p>
                                <p className="text-xs text-muted-foreground">{purchase.date}</p>
                              </div>
                              <p className="font-medium">{formatCurrency(purchase.amount)}</p>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">Items:</p>
                              <ul className="text-xs text-muted-foreground">
                                {purchase.items.map((item, index) => (
                                  <li key={index}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No purchase history available</p>
                    )
                  ) : (
                    selectedCustomer.repairHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCustomer.repairHistory.map(repair => (
                          <div key={repair.id} className="border rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{repair.id}</p>
                                <p className="text-xs text-muted-foreground">
                                  {repair.completedDate ? `Completed: ${repair.completedDate}` : 
                                   repair.startDate ? `Started: ${repair.startDate}` : 'Not started'}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {repair.status.charAt(0).toUpperCase() + repair.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">{repair.item} - {repair.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No repair history available</p>
                    )
                  )}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <div>
            <User size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No customer selected</p>
            <p className="text-sm">Search or add a customer to continue</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInfo;
