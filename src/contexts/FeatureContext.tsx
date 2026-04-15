import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

// Core features are ALWAYS enabled regardless of mainframe configuration.
// eslint-disable-next-line react-refresh/only-export-components
export const CORE_FEATURES = new Set([
  'pos',        // Point of Sale terminal
  'inventory',  // Inventory Management
  'customers',  // Customer Management
  'sales',      // Sales & Transactions (also covers End of Day Cash-Up)
  'repairs',    // Repair Management
  'cashiers',   // Staff/Cashiers Management
]);

const CACHE_KEY = 'mps_tenant_features';

function readCache(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(features: string[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(features)); } catch { /* ignore */ }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

interface FeatureContextType {
  enabledFeatures: string[];
  hasFeature: (key: string) => boolean;
  loading: boolean;
  reload: () => void;
}

const FeatureContext = createContext<FeatureContextType>({
  enabledFeatures: [],
  hasFeature: (key: string) => CORE_FEATURES.has(key),
  loading: true,
  reload: () => {},
});

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialise from cache so we never show features before the real list arrives
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(() => readCache() ?? []);
  const [loading, setLoading] = useState(true);
  const [everLoaded, setEverLoaded] = useState(() => readCache() !== null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      clearCache();
      setEnabledFeatures([]);
      setLoading(false);
      setEverLoaded(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.get<{ features: string[] }>('/mainframe/features/tenant-features');
      const features = data.features || [];
      setEnabledFeatures(features);
      writeCache(features);
      setEverLoaded(true);
    } catch {
      // On error: keep whatever we had (cache or previous load).
      // Do NOT fall back to "all features enabled" — that bypasses restrictions.
      // If we've never loaded successfully, we stay at core-only.
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and whenever the tab becomes visible (picks up mainframe changes)
  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const hasFeature = useCallback((key: string): boolean => {
    // Core features are always enabled — plan/mainframe cannot disable them
    if (CORE_FEATURES.has(key)) return true;

    // Still on the very first load with no cache: block non-core until we know
    if (loading && !everLoaded) return false;

    return enabledFeatures.includes(key);
  }, [enabledFeatures, loading, everLoaded]);

  return (
    <FeatureContext.Provider value={{ enabledFeatures, hasFeature, loading, reload: load }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => useContext(FeatureContext);
