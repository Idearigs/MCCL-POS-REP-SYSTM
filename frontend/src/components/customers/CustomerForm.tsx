import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/customer';
import CustomerDocuments from './CustomerDocuments';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (customer: Omit<Customer, 'id'>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

type TabType = 'details' | 'documents';

/**
 * Form for adding or editing a customer
 */
const CustomerForm: React.FC<CustomerFormProps> = ({ 
  customer, 
  onSubmit, 
  onCancel,
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>(() => {
    return {
      name: '',
      email: '',
      phone: '',
      notes: '',
      marketing_email: false,
      marketing_sms: false,
      marketing_phone: false,
      data_processing_consent: false
    };
  });

  // If customer is provided, populate form with customer data
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone,
        notes: customer.notes || '',
        marketing_email: customer.marketing_email,
        marketing_sms: customer.marketing_sms,
        marketing_phone: customer.marketing_phone,
        data_processing_consent: customer.data_processing_consent
      });
    }
  }, [customer]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEditMode = Boolean(customer?.id);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  // Only show tabs when editing an existing customer
  const showTabs = isEditMode && customer?.id;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {isEditMode ? 'Edit Customer' : 'Add New Customer'}
      </h2>
      
      {showTabs ? (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Customer Details
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Documents
            </button>
          </nav>
        </div>
      ) : (
        <p className="text-gray-600 mb-6">Enter customer details below</p>
      )}
      
      {activeTab === 'details' ? (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Additional information"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Marketing & Data Processing Consent */}
          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              Marketing & Data Processing Consent
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Marketing Preferences</h4>
                <p className="text-xs text-gray-500">
                  We would like to send you information about our products, special offers,
                  and services which we think you might be interested in.
                </p>
                
                <div className="flex items-center">
                  <input
                    id="marketing_email"
                    name="marketing_email"
                    type="checkbox"
                    checked={formData.marketing_email}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="marketing_email" className="ml-2 block text-sm text-gray-700">
                    I consent to receive marketing communications via Email
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="marketing_sms"
                    name="marketing_sms"
                    type="checkbox"
                    checked={formData.marketing_sms}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="marketing_sms" className="ml-2 block text-sm text-gray-700">
                    I consent to receive marketing communications via SMS
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="marketing_phone"
                    name="marketing_phone"
                    type="checkbox"
                    checked={formData.marketing_phone}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="marketing_phone" className="ml-2 block text-sm text-gray-700">
                    I consent to receive marketing communications via Phone calls
                  </label>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <h4 className="text-sm font-medium text-gray-700">Data Processing</h4>
                <p className="text-xs text-gray-500">
                  We need to process your personal data to manage your account, provide
                  services, and ensure security.
                </p>
                
                <div className="flex items-center">
                  <input
                    id="data_processing_consent"
                    name="data_processing_consent"
                    type="checkbox"
                    required
                    checked={formData.data_processing_consent}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="data_processing_consent" className="ml-2 block text-sm text-gray-700">
                    I consent to my personal data being processed as explained in the privacy policy
                  </label>
                </div>
              </div>
            </div>
          </div>
        
          {/* Form actions */}
          <div className="pt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.data_processing_consent}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-pulse">Saving...</span>
                </>
              ) : (
                'Save Customer'
              )}
            </button>
          </div>
        </div>
      </form>
    ) : (
      /* Documents tab content */
      customer?.id ? (
        <CustomerDocuments 
          customerId={customer.id} 
          customerName={customer.name} 
        />
      ) : null
    )}
  </div>
  );
};

export default CustomerForm;
