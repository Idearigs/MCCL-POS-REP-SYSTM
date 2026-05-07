import React, { createContext, useContext, useState, useCallback } from 'react';
import { outletService, type SelectedOutlet } from '../services/outletService';

interface OutletContextValue {
  currentOutlet: SelectedOutlet | null;
  selectOutlet: (outlet: SelectedOutlet) => void;
  clearOutlet: () => void;
}

const OutletContext = createContext<OutletContextValue | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const [currentOutlet, setCurrentOutlet] = useState<SelectedOutlet | null>(
    () => outletService.getStoredOutlet(),
  );

  const selectOutlet = useCallback((outlet: SelectedOutlet) => {
    outletService.storeOutlet(outlet);
    setCurrentOutlet(outlet);
  }, []);

  const clearOutlet = useCallback(() => {
    outletService.clearOutlet();
    setCurrentOutlet(null);
  }, []);

  return (
    <OutletContext.Provider value={{ currentOutlet, selectOutlet, clearOutlet }}>
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet(): OutletContextValue {
  const ctx = useContext(OutletContext);
  if (!ctx) throw new Error('useOutlet must be used inside OutletProvider');
  return ctx;
}
