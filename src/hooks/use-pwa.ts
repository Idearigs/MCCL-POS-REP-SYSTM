import { useEffect, useState } from 'react';

interface PWACapabilities {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isOnline: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

export const usePWA = (): PWACapabilities => {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    isOnline: navigator.onLine,
    platform: 'unknown'
  });

  useEffect(() => {
    // Check if app is installed/running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSInstalled = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isIOSInstalled;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: 'ios' | 'android' | 'desktop' | 'unknown' = 'unknown';

    if (/iphone|ipad|ipod/.test(userAgent)) {
      platform = 'ios';
    } else if (/android/.test(userAgent)) {
      platform = 'android';
    } else if (!/mobile/.test(userAgent)) {
      platform = 'desktop';
    }

    // Check if can install (will be updated by beforeinstallprompt event)
    let canInstall = false;
    const handleBeforeInstall = () => {
      canInstall = true;
      updateCapabilities();
    };

    const updateCapabilities = () => {
      setCapabilities({
        isInstalled,
        isStandalone,
        canInstall,
        isOnline: navigator.onLine,
        platform
      });
    };

    // Online/offline listeners
    const handleOnline = () => {
      setCapabilities(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setCapabilities(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateCapabilities();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return capabilities;
};

// Hook to check if service worker is supported
export const useServiceWorkerSupport = (): boolean => {
  return 'serviceWorker' in navigator;
};

// Hook to get PWA installation instructions based on platform
export const usePWAInstructions = (): string | null => {
  const { platform, isInstalled } = usePWA();

  if (isInstalled) {
    return null;
  }

  switch (platform) {
    case 'ios':
      return 'Tap the Share button and select "Add to Home Screen"';
    case 'android':
      return 'Tap the menu button and select "Add to Home Screen" or "Install App"';
    case 'desktop':
      return 'Click the install icon in your browser\'s address bar';
    default:
      return 'Check your browser menu for install or "Add to Home Screen" option';
  }
};
