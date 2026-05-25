import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

interface NetworkStatusProps {
  children?: React.ReactNode;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-red-600 text-white text-sm py-2 px-4 shadow-md">
          <WifiOff size={15} />
          <span>You are offline — sales are being saved locally and will sync when connection returns</span>
        </div>
      )}
      {showReconnected && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-green-600 text-white text-sm py-2 px-4 shadow-md">
          <Wifi size={15} />
          <span>Back online — syncing queued sales...</span>
        </div>
      )}
      {children}
    </>
  );
};

export default NetworkStatus;
