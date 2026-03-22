import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

interface FeatureContextType {
  enabledFeatures: string[];
  hasFeature: (key: string) => boolean;
  loading: boolean;
  reload: () => void;
}

const FeatureContext = createContext<FeatureContextType>({
  enabledFeatures: [],
  hasFeature: () => true,
  loading: false,
  reload: () => {},
});

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoaded(true); return; }

    setLoading(true);
    try {
      const data = await apiClient.get<{ features: string[] }>('/mainframe/features/tenant-features');
      setEnabledFeatures(data.features || []);
    } catch {
      // Fail open — empty list means hasFeature returns true for everything
      setEnabledFeatures([]);
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

  /** Returns true if a feature is enabled for this tenant.
   *  - Always true while loading or if the list failed to load (fail-open).
   *  - Always true if no featureKey is provided (item has no gate). */
  const hasFeature = useCallback((key: string): boolean => {
    if (!loaded || loading) return true;
    if (enabledFeatures.length === 0) return true; // fail-open
    return enabledFeatures.includes(key);
  }, [enabledFeatures, loaded, loading]);

  return (
    <FeatureContext.Provider value={{ enabledFeatures, hasFeature, loading, reload: load }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => useContext(FeatureContext);
