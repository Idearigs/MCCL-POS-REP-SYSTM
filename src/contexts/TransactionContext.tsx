import React, { createContext, useContext, useState, useEffect } from 'react';
import { salesService, Sale, CreateSaleData } from '../services/salesService';
import { repairService, Repair, CreateRepairData } from '../services/repairService';

// Types for our transaction data (extending backend types)
export type TransactionType = 'sale' | 'repair';
export type RepairStatus = 'RECEIVED' | 'ASSESSED' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'CANCELLED';

// UI-friendly sale transaction extending backend Sale
export interface SaleTransaction extends Sale {
  type: 'sale';
}

// UI-friendly repair transaction extending backend Repair
export interface RepairTransaction extends Repair {
  type: 'repair';
  status: RepairStatus;
}

export type Transaction = SaleTransaction | RepairTransaction;

// Convert backend Sale to UI SaleTransaction
const convertSaleToTransaction = (sale: Sale): SaleTransaction => ({
  ...sale,
  type: 'sale' as const
});

// Convert backend Repair to UI RepairTransaction
const convertRepairToTransaction = (repair: Repair): RepairTransaction => ({
  ...repair,
  type: 'repair' as const
});


// Context interface
interface TransactionContextType {
  salesTransactions: SaleTransaction[];
  repairTransactions: RepairTransaction[];
  loading: boolean;
  error: string | null;
  addSaleTransaction: (saleData: CreateSaleData) => Promise<SaleTransaction>;
  addRepairTransaction: (repairData: CreateRepairData) => Promise<RepairTransaction>;
  updateRepairStatus: (id: string, status: RepairStatus) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

// Create context
const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

// Provider component
export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for transactions
  const [salesTransactions, setSalesTransactions] = useState<SaleTransaction[]>([]);
  const [repairTransactions, setRepairTransactions] = useState<RepairTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transactions from backend on mount
  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load first pages of sales and repairs in parallel to get totals
      const [firstSalesRes, firstRepairsRes] = await Promise.all([
        salesService.getSales(1, 100),
        repairService.getRepairs(1, 100),
      ]);

      const salesTotalPages = firstSalesRes.meta?.totalPages || 1;
      const repairsTotalPages = firstRepairsRes.meta?.totalPages || 1;

      // Build remaining page numbers then fetch all in parallel
      const remainingSalesPages = Array.from({ length: Math.max(0, salesTotalPages - 1) }, (_, i) => i + 2);
      const remainingRepairsPages = Array.from({ length: Math.max(0, repairsTotalPages - 1) }, (_, i) => i + 2);

      const [remainingSalesResults, remainingRepairsResults] = await Promise.all([
        Promise.all(remainingSalesPages.map(p => salesService.getSales(p, 100))),
        Promise.all(remainingRepairsPages.map(p => repairService.getRepairs(p, 100))),
      ]);

      const allSales = [...firstSalesRes.data, ...remainingSalesResults.flatMap(r => r.data)];
      const allRepairsData = [...firstRepairsRes.data, ...remainingRepairsResults.flatMap(r => r.data)];

      const sales = allSales.map(convertSaleToTransaction);
      const repairs = allRepairsData.map(convertRepairToTransaction);

      setSalesTransactions(sales);
      setRepairTransactions(repairs);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err.message || 'Failed to load transactions');
      // Fall back to empty arrays instead of localStorage
      setSalesTransactions([]);
      setRepairTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Add a new sale transaction
  const addSaleTransaction = async (saleData: CreateSaleData): Promise<SaleTransaction> => {
    setLoading(true);
    setError(null);
    try {
      const newSale = await salesService.createSale(saleData);
      const newTransaction = convertSaleToTransaction(newSale);
      
      setSalesTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err: any) {
      console.error('Failed to create sale:', err);
      setError(err.message || 'Failed to create sale');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a new repair transaction
  const addRepairTransaction = async (repairData: CreateRepairData): Promise<RepairTransaction> => {
    setLoading(true);
    setError(null);
    try {
      const newRepair = await repairService.createRepair(repairData);
      const newTransaction = convertRepairToTransaction(newRepair);
      
      setRepairTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err: any) {
      console.error('Failed to create repair:', err);
      setError(err.message || 'Failed to create repair');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update repair status
  const updateRepairStatus = async (id: string, status: RepairStatus): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const updatedRepair = await repairService.updateRepair(id, { status });
      const updatedTransaction = convertRepairToTransaction(updatedRepair);
      
      setRepairTransactions(prev => 
        prev.map(repair => 
          repair.id === id ? updatedTransaction : repair
        )
      );
    } catch (err: any) {
      console.error('Failed to update repair status:', err);
      setError(err.message || 'Failed to update repair status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a transaction  
  const deleteTransaction = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Check if it's a sale transaction
      const isSale = salesTransactions.some(sale => sale.id === id);
      const isRepair = repairTransactions.some(repair => repair.id === id);
      
      if (isSale) {
        // For now, we can't delete sales through the current API
        // This would need a delete endpoint in the sales service
        throw new Error('Sale deletion not supported');
      } else if (isRepair) {
        await repairService.cancelRepair(id, 'Cancelled by user');
        setRepairTransactions(prev => prev.filter(repair => repair.id !== id));
      }
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      setError(err.message || 'Failed to delete transaction');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh transactions from backend
  const refreshTransactions = async () => {
    await loadTransactions();
  };

  return (
    <TransactionContext.Provider
      value={{
        salesTransactions,
        repairTransactions,
        loading,
        error,
        addSaleTransaction,
        addRepairTransaction,
        updateRepairStatus,
        deleteTransaction,
        refreshTransactions
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
