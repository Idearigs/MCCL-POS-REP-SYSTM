import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Settings types
export interface GeneralSettings {
  storeName: string;
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
  printerName: string;   // Windows printer name as shown in QZ Tray / Control Panel
  autoPrint: boolean;
  copies: 1 | 2;
  footerText: string;
  drawerPin?: string;   // 4-digit PIN for manual drawer open — only OWNER can set
  vatNumber?: string;   // store VAT registration number printed on receipts
}

export interface AllSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  printer: PrinterSettings;
}

interface SettingsContextType {
  settings: AllSettings;
  loading: boolean;
  updateGeneralSettings: (settings: GeneralSettings) => Promise<boolean>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<boolean>;
  updateAppearanceSettings: (settings: AppearanceSettings) => Promise<boolean>;
  updatePrinterSettings: (settings: PrinterSettings) => Promise<boolean>;
  toggleDarkMode: () => void;
  toggleCompactView: () => void;
  resetToDefaults: () => void;
}

const SETTINGS_STORAGE_KEY = 'mccl_pos_settings';

// Default settings
const defaultSettings: AllSettings = {
  general: {
    storeName: 'MCCL Jewelry Store',
    phone: '+44 20 1234 5678',
    email: 'contact@mccljewelry.com',
    address: '123 High Street, London, UK',
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
    receiptTemplate: `Thank you for shopping at MCCL Jewelry Store!

{ITEMS}

Total: {TOTAL}
Date: {DATE}

We appreciate your business!
Visit us again soon.`,
  },
  printer: {
    model: 'EPSON',
    printerName: '',
    autoPrint: false,
    copies: 1,
    footerText: 'Thank you for your purchase!\nPlease keep this receipt for your records.',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AllSettings>(() => {
    // Load settings from localStorage on initialization
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return {
          general: { ...defaultSettings.general, ...parsed.general },
          notifications: { ...defaultSettings.notifications, ...parsed.notifications },
          appearance: { ...defaultSettings.appearance, ...parsed.appearance },
          printer: { ...defaultSettings.printer, ...parsed.printer },
        };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return defaultSettings;
  });

  const [loading, setLoading] = useState(false);

  // Apply dark mode to document
  const applyDarkMode = useCallback((isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, []);

  // Apply compact view to document
  const applyCompactView = useCallback((isCompact: boolean) => {
    if (isCompact) {
      document.documentElement.classList.add('compact');
      document.body.classList.add('compact');
    } else {
      document.documentElement.classList.remove('compact');
      document.body.classList.remove('compact');
    }
  }, []);

  // Apply settings on mount and when they change
  useEffect(() => {
    applyDarkMode(settings.appearance.darkMode);
    applyCompactView(settings.appearance.compactView);
  }, [settings.appearance.darkMode, settings.appearance.compactView, applyDarkMode, applyCompactView]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [settings]);

  // Update general settings
  const updateGeneralSettings = async (newSettings: GeneralSettings): Promise<boolean> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));

      setSettings(prev => ({
        ...prev,
        general: newSettings,
      }));

      toast.success('General settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error updating general settings:', error);
      toast.error('Failed to save general settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (newSettings: NotificationSettings): Promise<boolean> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));

      setSettings(prev => ({
        ...prev,
        notifications: newSettings,
      }));

      toast.success('Notification settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to save notification settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update appearance settings
  const updateAppearanceSettings = async (newSettings: AppearanceSettings): Promise<boolean> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));

      setSettings(prev => ({
        ...prev,
        appearance: newSettings,
      }));

      toast.success('Appearance settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      toast.error('Failed to save appearance settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update printer settings
  const updatePrinterSettings = async (newSettings: PrinterSettings): Promise<boolean> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      setSettings(prev => ({ ...prev, printer: newSettings }));
      toast.success('Printer settings saved');
      return true;
    } catch (error) {
      console.error('Error updating printer settings:', error);
      toast.error('Failed to save printer settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Toggle dark mode - applies immediately
  const toggleDarkMode = () => {
    const newValue = !settings.appearance.darkMode;
    // Apply immediately
    applyDarkMode(newValue);
    // Update state
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        darkMode: newValue,
      },
    }));
  };

  // Toggle compact view - applies immediately
  const toggleCompactView = () => {
    const newValue = !settings.appearance.compactView;
    // Apply immediately
    applyCompactView(newValue);
    // Update state
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        compactView: newValue,
      },
    }));
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings(defaultSettings);
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
        toggleDarkMode,
        toggleCompactView,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings context
// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
