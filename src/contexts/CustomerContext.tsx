import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the Customer interface
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  redFlag: boolean;
  redFlagReason?: string;
  since: string;
  address?: string;
  marketingConsent: {
    email: boolean;
    sms: boolean;
    phone: boolean;
  };
  totalSpent: number;
  purchaseHistory: {
    id: string;
    date: string;
    items: string[];
    amount: number;
  }[];
  repairHistory: {
    id: string;
    status: string;
    item: string;
    description: string;
    startDate?: string;
    completedDate?: string;
  }[];
}

// Mock data for initial customers
const initialCustomers: Customer[] = [
  {
    id: 'CS001', 
    name: 'John Smith', 
    phone: '+44 123 456 7890', 
    email: 'john.smith@example.com',
    notes: 'Regular customer, prefers to be contacted by email.',
    redFlag: false,
    since: 'Jan 2022',
    address: '123 Main Street, London',
    marketingConsent: { email: true, sms: true, phone: false },
    totalSpent: 1250,
    purchaseHistory: [
      { id: 'SALE001', date: '2025-05-22', items: ['Diamond Solitaire Ring', 'Gold Chain Bracelet'], amount: 1799.98 },
      { id: 'SALE005', date: '2025-04-15', items: ['Silver Watch'], amount: 899.99 }
    ],
    repairHistory: [
      { id: 'REP001', status: 'completed', item: 'Gold Ring', description: 'Resize and polish', completedDate: '2023-01-20' }
    ]
  },
  {
    id: 'CS002', 
    name: 'Emily Johnson', 
    phone: '+44 234 567 8901', 
    email: 'emily.j@example.com',
    notes: 'VIP customer, interested in high-end watches.',
    redFlag: false,
    since: 'Mar 2021',
    address: '456 Park Avenue, Manchester',
    marketingConsent: { email: true, sms: false, phone: false },
    totalSpent: 3200,
    purchaseHistory: [
      { id: 'SALE002', date: '2025-05-21', items: ['Pearl Stud Earrings'], amount: 249.99 }
    ],
    repairHistory: [
      { id: 'REP002', status: 'in-progress', item: 'Diamond Earrings', description: 'Replace missing stone and clean', startDate: '2023-04-10' }
    ]
  },
  {
    id: 'CS003', 
    name: 'Michael Chen', 
    phone: '+44 345 678 9012', 
    email: 'mchen@example.com',
    notes: 'Has outstanding balance from previous purchase.',
    redFlag: true,
    redFlagReason: 'Outstanding balance: £250',
    since: 'Nov 2022',
    address: '789 Oak Street, Birmingham',
    marketingConsent: { email: false, sms: true, phone: true },
    totalSpent: 750,
    purchaseHistory: [
      { id: 'SALE003', date: '2025-05-20', items: ['Silver Watch', 'Emerald Pendant'], amount: 1549.98 }
    ],
    repairHistory: [
      { id: 'REP003', status: 'completed', item: 'Silver Watch', description: 'Battery replacement and band adjustment', completedDate: '2022-12-10' }
    ]
  },
  {
    id: 'CS004',
    name: 'Sarah Williams',
    email: 'sarah.w@example.com',
    phone: '(555) 876-5432',
    notes: 'Prefers gold jewelry',
    redFlag: false,
    since: 'Aug 2021',
    address: '202 Elm Court, Leeds',
    marketingConsent: { email: false, sms: false, phone: false },
    totalSpent: 2100,
    purchaseHistory: [
      { id: 'SALE008', date: '2022-01-23', items: ['Sapphire Ring', 'Cleaning Kit'], amount: 2100 }
    ],
    repairHistory: [
      { id: 'REP006', status: 'waiting', item: 'Sapphire Ring', description: 'Stone tightening', startDate: '2023-04-01' }
    ]
  },
  {
    id: 'CS005',
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    phone: '(555) 234-5678',
    notes: 'Interested in high-end watches',
    redFlag: false,
    since: 'May 2020',
    address: '101 Pine Road, Glasgow',
    marketingConsent: { email: true, sms: true, phone: true },
    totalSpent: 4500,
    purchaseHistory: [
      { id: 'SALE006', date: '2021-06-30', items: ['Gold Chain'], amount: 1500 },
      { id: 'SALE007', date: '2022-03-15', items: ['Diamond Necklace'], amount: 3000 }
    ],
    repairHistory: [
      { id: 'REP004', status: 'completed', item: 'Gold Chain', description: 'Link repair', completedDate: '2022-04-05' },
      { id: 'REP005', status: 'cancelled', item: 'Watch', description: 'Face replacement', startDate: '2022-08-12' }
    ]
  }
];

// Define the context interface
interface CustomerContextType {
  customers: Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
}

// Create the context
const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

// Create a provider component
export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Load customers from localStorage on initial render
  useEffect(() => {
    const storedCustomers = localStorage.getItem('customers');
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      setCustomers(initialCustomers);
      localStorage.setItem('customers', JSON.stringify(initialCustomers));
    }
  }, []);

  // Save customers to localStorage whenever they change
  useEffect(() => {
    if (customers.length > 0) {
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  }, [customers]);

  // Get a customer by ID
  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  // Add a new customer
  const addCustomer = (customerData: Omit<Customer, 'id'>) => {
    // Generate a new customer ID
    const newCustomerId = `CS${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Create the new customer object
    const newCustomer: Customer = {
      id: newCustomerId,
      ...customerData
    };
    
    // Add the new customer to the state
    setCustomers(prevCustomers => [...prevCustomers, newCustomer]);
    
    return newCustomer;
  };

  // Update an existing customer
  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prevCustomers => 
      prevCustomers.map(customer => 
        customer.id === id ? { ...customer, ...updates } : customer
      )
    );
  };

  // Delete a customer
  const deleteCustomer = (id: string) => {
    setCustomers(prevCustomers => 
      prevCustomers.filter(customer => customer.id !== id)
    );
  };

  // Context value
  const value = {
    customers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer
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
