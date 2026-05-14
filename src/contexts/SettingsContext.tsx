import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneralSettings {
  storeName: string;
  tradingName?: string; // legal entity line printed on receipts
  phone: string;
  email: string;
  address: string;
  currency: string;
  taxRate: number;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  lowStockAlerts: boolean;
  repairStatusUpdates: boolean;
  dailySummary: boolean;
}

export interface AppearanceSettings {
  darkMode: boolean;
  compactView: boolean;
  receiptTemplate: string;
}

export type PrinterModel = 'ONIX' | 'EPSON' | 'STAR_TSP100' | 'OTHER';

export interface PrinterSettings {
  model: PrinterModel;
  printerName: string;
  autoPrint: boolean;
  copies: 1 | 2;
  footerText: string;
  drawerPin?: string;
  vatNumber?: string;
}

export interface MetalSettings {
  goldMarginPercent: number;
  silverMarginPercent: number;
  platinumMarginPercent: number;
}

export interface AllSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  printer: PrinterSettings;
  metals: MetalSettings;
}

interface SettingsContextType {
  settings: AllSettings;
  loading: boolean;
  updateGeneralSettings: (settings: GeneralSettings) => Promise<boolean>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<boolean>;
  updateAppearanceSettings: (settings: AppearanceSettings) => Promise<boolean>;
  updatePrinterSettings: (settings: PrinterSettings) => Promise<boolean>;
  updateMetalSettings: (settings: MetalSettings) => Promise<boolean>;
  toggleDarkMode: () => void;
  toggleCompactView: () => void;
  resetToDefaults: () => void;
}

// ─── Defaults (used when DB returns nothing) ──────────────────────────────────

const defaultSettings: AllSettings = {
  metals: {
    goldMarginPercent: 0,
    silverMarginPercent: 0,
    platinumMarginPercent: 0,
  },
  general: {
    storeName: 'Andrew McCulloch Jewellers',
    tradingName: 'A trading name of Beeston Jewellers Ltd',
    phone: '0115 925 7552',
    email: '',
    address: '7 The Square\nBeeston\nNottingham NG9 2JG',
    currency: 'GBP',
    taxRate: 20,
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    repairStatusUpdates: true,
    dailySummary: false,
  },
  appearance: {
    darkMode: false,
    compactView: false,
    receiptTemplate: '',
  },
  printer: {
    model: 'STAR_TSP100',
    printerName: '',
    autoPrint: false,
    copies: 1,
    footerText:
      'Thank you for shopping\nKEEP THIS RECEIPT AS PROOF OF PURCHASE\nRETURNS OR EXCHANGES WITHIN 14 DAYS WITH RECEIPT\nITEMS MUST BE UNWORN IN ORIGINAL CONDITION\nPEARLS RESTRINGING BESPOKE AND EARRINGS CARRIES NO GUARANTEE OR REFUND STATUTORY RIGHTS UNAFFECTED',
    vatNumber: '275322603',
  },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const CACHE_KEY = 'mccl_pos_settings_cache'; // localStorage — fast-load only, not source of truth

function getApiBase(): string {
  return (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3007/api/v1';
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken') ?? '';
  const tenantId = localStorage.getItem('tenantId') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  };
}

function mergeWithDefaults(raw: Partial<AllSettings>): AllSettings {
  return {
    general: { ...defaultSettings.general, ...(raw.general ?? {}) },
    notifications: { ...defaultSettings.notifications, ...(raw.notifications ?? {}) },
    appearance: { ...defaultSettings.appearance, ...(raw.appearance ?? {}) },
    printer: { ...defaultSettings.printer, ...(raw.printer ?? {}) },
    metals: { ...defaultSettings.metals, ...(raw.metals ?? {}) },
  };
}

function readCache(): AllSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return mergeWithDefaults(JSON.parse(raw) as Partial<AllSettings>);
  } catch {
    return null;
  }
}

function writeCache(s: AllSettings): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* non-fatal */ }
}

async function fetchSettings(): Promise<AllSettings> {
  const res = await fetch(`${getApiBase()}/settings`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`);
  const data = (await res.json()) as Partial<AllSettings>;
  return mergeWithDefaults(data);
}

async function patchSettings(section: Partial<AllSettings>): Promise<AllSettings> {
  const res = await fetch(`${getApiBase()}/settings`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(section),
  });
  if (!res.ok) throw new Error(`Settings save failed: ${res.status}`);
  const data = (await res.json()) as Partial<AllSettings>;
  return mergeWithDefaults(data);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialise from cache so the UI renders immediately, then hydrate from DB
  const [settings, setSettings] = useState<AllSettings>(readCache() ?? defaultSettings);
  const [loading, setLoading] = useState(false);

  const applyDarkMode = useCallback((isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
  }, []);

  const applyCompactView = useCallback((isCompact: boolean) => {
    document.documentElement.classList.toggle('compact', isCompact);
    document.body.classList.toggle('compact', isCompact);
  }, []);

  // Re-apply visual settings whenever they change
  useEffect(() => {
    applyDarkMode(settings.appearance.darkMode);
    applyCompactView(settings.appearance.compactView);
  }, [settings.appearance.darkMode, settings.appearance.compactView, applyDarkMode, applyCompactView]);

  // Hydrate from database on mount (silently falls back to cache if unauthenticated)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return; // not logged in yet — skip
    fetchSettings()
      .then((fresh) => {
        setSettings(fresh);
        writeCache(fresh);
      })
      .catch(() => {
        // API unreachable — keep using the cached value, no error shown to user
      });
  }, []);

  // ─── Updaters — save to DB first, then update state ─────────────────────────

  const updateGeneralSettings = async (newSettings: GeneralSettings): Promise<boolean> => {
    setLoading(true);
    try {
      const updated = await patchSettings({ general: newSettings });
      setSettings(updated);
      writeCache(updated);
      toast.success('General settings saved');
      return true;
    } catch {
      toast.error('Failed to save general settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async (newSettings: NotificationSettings): Promise<boolean> => {
    setLoading(true);
    try {
      const updated = await patchSettings({ notifications: newSettings });
      setSettings(updated);
      writeCache(updated);
      toast.success('Notification settings saved');
      return true;
    } catch {
      toast.error('Failed to save notification settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAppearanceSettings = async (newSettings: AppearanceSettings): Promise<boolean> => {
    setLoading(true);
    try {
      const updated = await patchSettings({ appearance: newSettings });
      setSettings(updated);
      writeCache(updated);
      toast.success('Appearance settings saved');
      return true;
    } catch {
      toast.error('Failed to save appearance settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePrinterSettings = async (newSettings: PrinterSettings): Promise<boolean> => {
    setLoading(true);
    try {
      const updated = await patchSettings({ printer: newSettings });
      setSettings(updated);
      writeCache(updated);
      toast.success('Printer settings saved');
      return true;
    } catch {
      toast.error('Failed to save printer settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateMetalSettings = async (newSettings: MetalSettings): Promise<boolean> => {
    setLoading(true);
    try {
      const updated = await patchSettings({ metals: newSettings });
      setSettings(updated);
      writeCache(updated);
      toast.success('Metal margins saved');
      return true;
    } catch {
      toast.error('Failed to save metal margins');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Dark mode / compact view toggle immediately (also persists via appearance update)
  const toggleDarkMode = () => {
    const newValue = !settings.appearance.darkMode;
    applyDarkMode(newValue);
    const next = { ...settings, appearance: { ...settings.appearance, darkMode: newValue } };
    setSettings(next);
    writeCache(next);
    patchSettings({ appearance: next.appearance }).catch(() => {});
  };

  const toggleCompactView = () => {
    const newValue = !settings.appearance.compactView;
    applyCompactView(newValue);
    const next = { ...settings, appearance: { ...settings.appearance, compactView: newValue } };
    setSettings(next);
    writeCache(next);
    patchSettings({ appearance: next.appearance }).catch(() => {});
  };

  const resetToDefaults = () => {
    patchSettings(defaultSettings)
      .then((updated) => { setSettings(updated); writeCache(updated); })
      .catch(() => {});
    toast.success('Settings reset to defaults');
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateGeneralSettings,
        updateNotificationSettings,
        updateAppearanceSettings,
        updatePrinterSettings,
        updateMetalSettings,
        toggleDarkMode,
        toggleCompactView,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
