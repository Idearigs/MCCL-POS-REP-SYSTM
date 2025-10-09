import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from '@/hooks/use-toast';
import { useCustomers, Customer } from '@/contexts/CustomerContext';

interface AddCustomerFormProps {
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

const AddCustomerForm: React.FC<AddCustomerFormProps> = ({ 
  onClose,
  onSuccess
}) => {
  const { addCustomer } = useCustomers();
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    marketingConsent: {
      email: false,
      sms: false,
      phone: false
    },
    dataProcessingConsent: false
  });

  // Handle creating a new customer
  const handleCreateCustomer = async () => {
    try {
      // Validate required fields
      if (!newCustomer.name || !newCustomer.phone) {
        toast({
          title: "Missing information",
          description: "Please provide at least a name and phone number.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Validate data processing consent
      if (!newCustomer.dataProcessingConsent) {
        toast({
          title: "Data processing consent required",
          description: "You must consent to data processing to create an account.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Create a new customer in the context (this will call the backend)
      const currentDate = new Date();
      const formattedDate = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getFullYear()}`;
      
      const createdCustomer = await addCustomer({
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        notes: newCustomer.notes,
        redFlag: false,
        since: formattedDate,
        marketingConsent: newCustomer.marketingConsent,
        dataProcessingConsent: newCustomer.dataProcessingConsent,
        totalSpent: 0,
        purchaseHistory: [],
        repairHistory: []
      });

      // Reset the form only on success
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        notes: '',
        marketingConsent: {
          email: false,
          sms: false,
          phone: false
        },
        dataProcessingConsent: false
      });

      toast({
        title: "Customer created",
        description: `${newCustomer.name} has been added successfully.`,
        duration: 3000,
      });

      // Close the dialog
      onClose();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(createdCustomer);
      }

    } catch (error: any) {
      console.error('Error creating customer:', error);
      
      // Handle specific error types
      let errorMessage = "Failed to create customer. Please try again.";
      
      if (error.message) {
        if (error.message.includes('phone') && error.message.includes('already exists')) {
          errorMessage = "A customer with this phone number already exists.";
        } else if (error.message.includes('email') && error.message.includes('already exists')) {
          errorMessage = "A customer with this email address already exists.";
        } else if (error.message.includes('duplicate') || error.message.includes('unique constraint')) {
          errorMessage = "A customer with this phone number or email already exists.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error creating customer",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogDescription>
          Enter customer details below
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4 overflow-y-auto pr-1">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">Name *</label>
          <Input 
            id="name" 
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
            placeholder="Full name"
          />
        </div>
        
        <div className="grid gap-2">
          <label htmlFor="phone" className="text-sm font-medium">Phone *</label>
          <Input 
            id="phone" 
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
            placeholder="Phone number"
          />
        </div>
        
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input 
            id="email" 
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
            placeholder="Email address"
          />
        </div>
        
        <div className="grid gap-2">
          <label htmlFor="notes" className="text-sm font-medium">Notes</label>
          <Textarea 
            id="notes" 
            value={newCustomer.notes}
            onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
            placeholder="Additional information"
            rows={3}
          />
        </div>
        
        {/* Marketing & Data Processing Consent */}
        <div className="space-y-4 border rounded-md p-4 mt-2">
          <h3 className="font-medium mb-2">Marketing & Data Processing Consent</h3>
          
          {/* Marketing Preferences */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Marketing Preferences</h4>
            <p className="text-xs text-muted-foreground mb-2">
              We would like to send you information about our products, special offers, and services which we think you might be interested in.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email-consent" 
                  checked={newCustomer.marketingConsent.email}
                  onCheckedChange={(checked) => 
                    setNewCustomer({
                      ...newCustomer, 
                      marketingConsent: {
                        ...newCustomer.marketingConsent,
                        email: !!checked
                      }
                    })
                  } 
                />
                <Label htmlFor="email-consent" className="text-sm font-normal">
                  I consent to receive marketing communications via Email
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sms-consent" 
                  checked={newCustomer.marketingConsent.sms}
                  onCheckedChange={(checked) => 
                    setNewCustomer({
                      ...newCustomer, 
                      marketingConsent: {
                        ...newCustomer.marketingConsent,
                        sms: !!checked
                      }
                    })
                  } 
                />
                <Label htmlFor="sms-consent" className="text-sm font-normal">
                  I consent to receive marketing communications via SMS
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="phone-consent" 
                  checked={newCustomer.marketingConsent.phone}
                  onCheckedChange={(checked) => 
                    setNewCustomer({
                      ...newCustomer, 
                      marketingConsent: {
                        ...newCustomer.marketingConsent,
                        phone: !!checked
                      }
                    })
                  } 
                />
                <Label htmlFor="phone-consent" className="text-sm font-normal">
                  I consent to receive marketing communications via Phone calls
                </Label>
              </div>
            </div>
          </div>
          
          {/* Data Processing */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Data Processing</h4>
            <p className="text-xs text-muted-foreground mb-2">
              We need to process your personal data to manage your account, provide services, and ensure security.
            </p>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="data-consent" 
                checked={newCustomer.dataProcessingConsent}
                onCheckedChange={(checked) => 
                  setNewCustomer({
                    ...newCustomer, 
                    dataProcessingConsent: !!checked
                  })
                } 
                required
              />
              <Label htmlFor="data-consent" className="text-sm font-normal">
                I consent to my personal data being processed as explained in the privacy policy
              </Label>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t mt-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreateCustomer}>
          Create Customer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default AddCustomerForm;
