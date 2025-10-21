import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { customerService, Customer as ServiceCustomer, CreateCustomerData } from '../services/customerService';
import { useAuth } from './AuthContext';

// Extended Customer interface that includes backend fields plus legacy UI fields
export interface Customer extends Omit<ServiceCustomer, 'phone' | 'email' | 'notes'> {
  phone: string;  // Make required for UI
  email: string;  // Make required for UI  
  notes: string;  // Make required for UI
  redFlag?: boolean;
  redFlagReason?: string;
  since?: string;
  marketingConsent?: {
    email: boolean;
    sms: boolean;
    phone: boolean;
  };
  totalSpent?: number;
  purchaseHistory?: {
    id: string;
    date: string;
    items: string[];
    amount: number;
  }[];
  repairHistory?: {
    id: string;
    status: string;
    item: string;
    description: string;
    startDate?: string;
    completedDate?: string;
  }[];
}

// Convert backend customer to UI customer format
const convertBackendCustomer = (customer: ServiceCustomer): Customer => ({
  ...customer,
  name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
  phone: customer.phone || '',
  email: customer.email || '',
  notes: customer.notes || '',
  // Legacy UI fields with defaults
  redFlag: false,
  since: new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  marketingConsent: { 
    email: customer.marketingEmail || false, 
    sms: customer.marketingSms || false, 
    phone: customer.marketingPhone || false 
  },
  totalSpent: 0,
  purchaseHistory: [],
  repairHistory: []
});

// Convert UI customer to backend format
const convertToBackendCustomer = (customer: any): any => {
  return {
    name: customer.name,
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zipCode,
    country: customer.country,
    dateOfBirth: customer.dateOfBirth,
    notes: customer.notes || undefined,
    // Marketing consent fields mapped to backend format
    marketingEmail: customer.marketingConsent?.email || false,
    marketingSms: customer.marketingConsent?.sms || false,
    marketingPhone: customer.marketingConsent?.phone || false,
    dataProcessingConsent: customer.dataProcessingConsent
  };
};

// Define the context interface
interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'isActive'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

// Create the context
const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

// Create a provider component
export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load customers from backend on initial render
  const loadCustomers = useCallback(async () => {
    // Only load if user is authenticated
    if (!auth.isAuthenticated) {
      console.log('⚠️ User not authenticated, skipping customers load');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('📦 Loading customers for authenticated user...');
      const result = await customerService.getCustomers();
      const backendCustomers = Array.isArray(result) ? result : result.data;
      const uiCustomers = backendCustomers.map(convertBackendCustomer);
      setCustomers(uiCustomers);
      console.log(`✅ Loaded ${uiCustomers.length} customers from database`);
    } catch (err: any) {
      console.error('❌ Failed to load customers:', err);
      setError(err.message || 'Failed to load customers');
      // Fall back to empty array instead of localStorage
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated]); // Depend on auth status

  // Load customers when user logs in
  useEffect(() => {
    if (auth.isAuthenticated && !auth.loading) {
      loadCustomers();
    } else if (!auth.isAuthenticated) {
      // Clear customers when user logs out
      setCustomers([]);
    }
  }, [auth.isAuthenticated, auth.loading, loadCustomers]);

  // Get a customer by ID
  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  // Add a new customer
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'isActive'>) => {
    setLoading(true);
    setError(null);
    try {
      const backendData = convertToBackendCustomer(customerData);
      const newBackendCustomer = await customerService.createCustomer(backendData);
      const newCustomer = convertBackendCustomer(newBackendCustomer);
      
      setCustomers(prevCustomers => [...prevCustomers, newCustomer]);
      return newCustomer;
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      setError(err.message || 'Failed to create customer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing customer
  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    console.log('CustomerContext: Starting customer update', { id, updates });
    setLoading(true);
    setError(null);
    try {
      // Convert UI updates to backend format
      const backendUpdates: any = {};
      if (updates.name) backendUpdates.name = updates.name;
      if (updates.email !== undefined) backendUpdates.email = updates.email || undefined;
      if (updates.phone !== undefined) backendUpdates.phone = updates.phone || undefined;
      if (updates.address !== undefined) backendUpdates.address = updates.address;
      if (updates.city !== undefined) backendUpdates.city = updates.city;
      if (updates.state !== undefined) backendUpdates.state = updates.state;
      if (updates.zipCode !== undefined) backendUpdates.zipCode = updates.zipCode;
      if (updates.country !== undefined) backendUpdates.country = updates.country;
      if (updates.dateOfBirth !== undefined) backendUpdates.dateOfBirth = updates.dateOfBirth;
      if (updates.notes !== undefined) backendUpdates.notes = updates.notes || undefined;
      
      // Handle marketing consent updates
      if (updates.marketingConsent) {
        backendUpdates.marketingEmail = updates.marketingConsent.email;
        backendUpdates.marketingSms = updates.marketingConsent.sms;
        backendUpdates.marketingPhone = updates.marketingConsent.phone;
      }
      
      console.log('CustomerContext: Sending to backend', backendUpdates);
      const updatedBackendCustomer = await customerService.updateCustomer(id, backendUpdates);
      console.log('CustomerContext: Backend response', updatedBackendCustomer);
      
      const updatedCustomer = convertBackendCustomer(updatedBackendCustomer);
      console.log('CustomerContext: Converted customer', updatedCustomer);
      
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.id === id ? { ...updatedCustomer, ...updates } : customer
        )
      );
      console.log('CustomerContext: Customer update completed successfully');
    } catch (err: any) {
      console.error('CustomerContext: Failed to update customer:', err);
      setError(err.message || 'Failed to update customer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a customer
  const deleteCustomer = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await customerService.deleteCustomer(id);
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer.id !== id)
      );
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      setError(err.message || 'Failed to delete customer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh customers from backend - memoized to prevent infinite loops
  const refreshCustomers = useCallback(async () => {
    await loadCustomers();
  }, [loadCustomers]);

  // Context value
  const value = {
    customers,
    loading,
    error,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refreshCustomers
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};

// Custom hook to use the customer context
export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
