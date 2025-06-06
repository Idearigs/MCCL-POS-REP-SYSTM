import React, { useState } from 'react';
import { Customer } from '../types/customer';
import useCustomers from '../hooks/useCustomers';
import CustomerList from '../components/customers/CustomerList';
import CustomerForm from '../components/customers/CustomerForm';

/**
 * Customers page component that displays customer cards and handles customer management
 */
const CustomersPage: React.FC = () => {
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  // Handle customer form submission for adding or editing
  const handleCustomerSubmit = async (customerData: Omit<Customer, 'id'>) => {
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        // Update existing customer
        await updateCustomer(editingCustomer.id!, customerData);
        setEditingCustomer(null);
      } else {
        // Add new customer
        await addCustomer(customerData);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error submitting customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle customer edit button click
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddForm(false);
  };

  // Handle customer delete button click
  const handleDeleteCustomer = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  // Handle cancel button click on forms
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingCustomer(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Customer
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search customers by name, email or phone"
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Customer form */}
      {(showAddForm || editingCustomer) && (
        <div className="mb-8">
          <CustomerForm
            customer={editingCustomer || undefined}
            onSubmit={handleCustomerSubmit}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Customer list */}
      <CustomerList
        customers={customers}
        loading={loading}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
      />
    </div>
  );
};

export default CustomersPage;
