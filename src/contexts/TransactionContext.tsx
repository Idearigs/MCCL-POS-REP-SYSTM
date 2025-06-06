import React, { createContext, useContext, useState, useEffect } from 'react';

// Types for our transaction data
export type TransactionType = 'sale' | 'repair';
export type RepairStatus = 'received' | 'in-progress' | 'completed' | 'collected';

export interface SaleTransaction {
  id: string;
  type: 'sale';
  customerName: string;
  customerId?: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    karat?: string;
    weight?: string;
    discount?: number;
  }[];
  totalAmount: number;
  date: string;
  paymentMethod: string;
}

export interface RepairTransaction {
  id: string;
  type: 'repair';
  customerName: string;
  customerId?: string;
  itemDescription: string;
  status: RepairStatus;
  estimatedPrice: number;
  date: string;
  completedDate?: string;
}

export type Transaction = SaleTransaction | RepairTransaction;

// Initial sample data
const initialSalesData: SaleTransaction[] = [
  {
    id: 'SALE001',
    type: 'sale',
    customerName: 'John Smith',
    customerId: 'CS001',
    items: [
      { id: '1', name: 'Diamond Solitaire Ring', price: 1299.99, quantity: 1, sku: 'RNG-DS-001', karat: '18K Gold', weight: '3.5g' },
      { id: '2', name: 'Gold Chain Bracelet', price: 499.99, quantity: 1, sku: 'BRC-GC-002', karat: '14K Gold', weight: '8.2g' }
    ],
    totalAmount: 1799.98,
    date: '2025-05-22',
    paymentMethod: 'Credit Card'
  },
  {
    id: 'SALE002',
    type: 'sale',
    customerName: 'Emily Johnson',
    customerId: 'CS002',
    items: [
      { id: '3', name: 'Pearl Stud Earrings', price: 249.99, quantity: 1, sku: 'EAR-PS-003', karat: '925 Silver', weight: '2.1g' }
    ],
    totalAmount: 249.99,
    date: '2025-05-21',
    paymentMethod: 'Cash'
  },
  {
    id: 'SALE003',
    type: 'sale',
    customerName: 'Michael Chen',
    customerId: 'CS003',
    items: [
      { id: '4', name: 'Silver Watch', price: 899.99, quantity: 1, sku: 'WTC-SV-004', karat: '925 Silver', weight: '45g' },
      { id: '5', name: 'Emerald Pendant', price: 649.99, quantity: 1, sku: 'NCK-EP-005', karat: '18K Gold', weight: '4.3g' }
    ],
    totalAmount: 1549.98,
    date: '2025-05-20',
    paymentMethod: 'Credit Card'
  },
  {
    id: 'SALE004',
    type: 'sale',
    customerName: 'Sarah Williams',
    customerId: 'CS004',
    items: [
      { id: '6', name: 'Sapphire Ring', price: 1499.99, quantity: 1, sku: 'RNG-SR-006', karat: 'Platinum 950', weight: '5.8g' }
    ],
    totalAmount: 1499.99,
    date: '2025-05-19',
    paymentMethod: 'Debit Card'
  }
];

const initialRepairsData: RepairTransaction[] = [
  {
    id: 'REP001',
    type: 'repair',
    customerName: 'John Smith',
    customerId: 'CS001',
    itemDescription: 'Gold Ring - Resize and polish',
    status: 'received',
    estimatedPrice: 45.00,
    date: '2025-05-22'
  },
  {
    id: 'REP002',
    type: 'repair',
    customerName: 'Emily Johnson',
    customerId: 'CS002',
    itemDescription: 'Diamond Earrings - Replace missing stone and clean',
    status: 'in-progress',
    estimatedPrice: 120.00,
    date: '2025-05-20'
  },
  {
    id: 'REP003',
    type: 'repair',
    customerName: 'Michael Chen',
    customerId: 'CS003',
    itemDescription: 'Silver Watch - Battery replacement and band adjustment',
    status: 'completed',
    estimatedPrice: 35.00,
    date: '2025-05-18',
    completedDate: '2025-05-24'
  },
  {
    id: 'REP004',
    type: 'repair',
    customerName: 'Sarah Williams',
    customerId: 'CS004',
    itemDescription: 'Pearl Necklace - Restring and clasp repair',
    status: 'collected',
    estimatedPrice: 65.00,
    date: '2025-05-15',
    completedDate: '2025-05-20'
  }
];

// Context interface
interface TransactionContextType {
  salesTransactions: SaleTransaction[];
  repairTransactions: RepairTransaction[];
  addSaleTransaction: (transaction: SaleTransaction) => void;
  addRepairTransaction: (transaction: RepairTransaction) => void;
  updateRepairStatus: (id: string, status: RepairStatus) => void;
  deleteTransaction: (id: string) => void;
}

// Create context
const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

// Provider component
export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for transactions
  const [salesTransactions, setSalesTransactions] = useState<SaleTransaction[]>(initialSalesData);
  const [repairTransactions, setRepairTransactions] = useState<RepairTransaction[]>(initialRepairsData);

  // Load transactions from localStorage on mount
  useEffect(() => {
    const savedSales = localStorage.getItem('salesTransactions');
    const savedRepairs = localStorage.getItem('repairTransactions');
    
    if (savedSales) {
      setSalesTransactions(JSON.parse(savedSales));
    }
    
    if (savedRepairs) {
      setRepairTransactions(JSON.parse(savedRepairs));
    }
  }, []);

  // Save transactions to localStorage when they change
  useEffect(() => {
    localStorage.setItem('salesTransactions', JSON.stringify(salesTransactions));
  }, [salesTransactions]);

  useEffect(() => {
    localStorage.setItem('repairTransactions', JSON.stringify(repairTransactions));
  }, [repairTransactions]);

  // Add a new sale transaction
  const addSaleTransaction = (transaction: SaleTransaction) => {
    // Generate a new ID if not provided
    if (!transaction.id) {
      const nextId = `SALE${(salesTransactions.length + 1).toString().padStart(3, '0')}`;
      transaction.id = nextId;
    }
    
    // Add timestamp if not provided
    if (!transaction.date) {
      transaction.date = new Date().toISOString().split('T')[0];
    }
    
    setSalesTransactions(prev => [transaction, ...prev]);
  };

  // Add a new repair transaction
  const addRepairTransaction = (transaction: RepairTransaction) => {
    // Generate a new ID if not provided
    if (!transaction.id) {
      const nextId = `REP${(repairTransactions.length + 1).toString().padStart(3, '0')}`;
      transaction.id = nextId;
    }
    
    // Add timestamp if not provided
    if (!transaction.date) {
      transaction.date = new Date().toISOString().split('T')[0];
    }
    
    setRepairTransactions(prev => [transaction, ...prev]);
  };

  // Update repair status
  const updateRepairStatus = (id: string, status: RepairStatus) => {
    setRepairTransactions(prev => 
      prev.map(repair => {
        if (repair.id === id) {
          const updatedRepair = { ...repair, status };
          
          // Add completed date if status is 'completed' or 'collected'
          if ((status === 'completed' || status === 'collected') && !repair.completedDate) {
            updatedRepair.completedDate = new Date().toISOString().split('T')[0];
          }
          
          return updatedRepair;
        }
        return repair;
      })
    );
  };

  // Delete a transaction
  const deleteTransaction = (id: string) => {
    // Check if it's a sale transaction
    if (id.startsWith('SALE')) {
      setSalesTransactions(prev => prev.filter(sale => sale.id !== id));
    }
    // Check if it's a repair transaction
    else if (id.startsWith('REP')) {
      setRepairTransactions(prev => prev.filter(repair => repair.id !== id));
    }
  };

  return (
    <TransactionContext.Provider
      value={{
        salesTransactions,
        repairTransactions,
        addSaleTransaction,
        addRepairTransaction,
        updateRepairStatus,
        deleteTransaction
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

// Custom hook to use the transaction context
export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
