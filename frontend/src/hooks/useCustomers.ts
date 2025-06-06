import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types/customer';
import { customerService } from '../services/customerService';
import { useToast } from '../components/ui/use-toast';

/**
 * Custom hook for managing customers
 */
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  /**
   * Fetch all customers with optional search
   */
  const fetchCustomers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomers(search);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
      toast.error('Error', 'Failed to fetch customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Add a new customer
   */
  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      const newCustomer = await customerService.createCustomer(customer);
      setCustomers(prev => [...prev, newCustomer]);
      toast.success('Success', 'Customer added successfully!');
      return newCustomer;
    } catch (err: any) {
      setError(err.message || 'Failed to add customer');
      toast.error('Error', 'Failed to add customer. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Update an existing customer
   */
  const updateCustomer = useCallback(async (id: number, customerData: Partial<Customer>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedCustomer = await customerService.updateCustomer(id, customerData);
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === id ? updatedCustomer : customer
        )
      );
      toast.success('Success', 'Customer updated successfully!');
      return updatedCustomer;
    } catch (err: any) {
      setError(err.message || 'Failed to update customer');
      toast.error('Error', 'Failed to update customer. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Delete a customer
   */
  const deleteCustomer = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const success = await customerService.deleteCustomer(id);
      if (success) {
        setCustomers(prev => prev.filter(customer => customer.id !== id));
        toast.success('Success', 'Customer deleted successfully!');
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete customer');
      toast.error('Error', 'Failed to delete customer. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer
  };
};

export default useCustomers;
