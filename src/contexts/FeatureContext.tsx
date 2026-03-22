import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

// Core features are ALWAYS enabled regardless of mainframe configuration.
// They represent the minimum viable POS functionality every tenant needs.
// Even if the mainframe is unreachable, these are never hidden.
export const CORE_FEATURES = new Set([
  'pos',        // Point of Sale terminal
  'inventory',  // Inventory Management
  'customers',  // Customer Management
  'sales',      // Sales & Transactions (also covers End of Day Cash-Up)
  'repairs',    // Repair Management
  'cashiers',   // Staff/Cashiers Management
]);

interface FeatureContextType {
  enabledFeatures: string[];
  hasFeature: (key: string) => boolean;
  loading: boolean;
  reload: () => void;
}

const FeatureContext = createContext<FeatureContextType>({
  enabledFeatures: [],
  hasFeature: (key: string) => CORE_FEATURES.has(key),
  loading: false,
  reload: () => {},
});

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoaded(true); setLoadError(false); return; }

    setLoading(true);
    try {
      const data = await apiClient.get<{ features: string[] }>('/mainframe/features/tenant-features');
      setEnabledFeatures(data.features || []);
      setLoadError(false);
    } catch {
      // Keep existing features on transient errors rather than clearing them
      setLoadError(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  // Load on mount and reload whenever the tab becomes visible again
  // This ensures feature changes made in mainframe take effect without a full logout
  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const hasFeature = useCallback((key: string): boolean => {
    // Core features are ALWAYS enabled — no mainframe config can disable them
    if (CORE_FEATURES.has(key)) return true;

    // While loading or on error: fail-open (show non-core features too)
    if (!loaded || loading || loadError) return true;

    // Features were loaded: check the list
    return enabledFeatures.includes(key);
  }, [enabledFeatures, loaded, loading, loadError]);

  return (
    <FeatureContext.Provider value={{ enabledFeatures, hasFeature, loading, reload: load }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => useContext(FeatureContext);
