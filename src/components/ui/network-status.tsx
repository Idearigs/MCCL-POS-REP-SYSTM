import React, { useState, useEffect } from 'react';
import LoadingSpinner from './loading-spinner';

interface NetworkStatusProps {
  children?: React.ReactNode;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectingTime, setReconnectingTime] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show reconnecting message for a moment before hiding
      setIsReconnecting(true);
      setTimeout(() => {
        setIsReconnecting(false);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setReconnectingTime(0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start timer when offline
    let interval: NodeJS.Timeout | null = null;
    if (!isOnline) {
      interval = setInterval(() => {
        setReconnectingTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline && !isReconnecting) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center max-w-md mx-auto">
        <LoadingSpinner size="lg" color="border-blue-500" />
        
        {!isOnline ? (
          <>
            <p className="mt-4 text-gray-800 font-medium text-center">Internet connection lost</p>
            <p className="text-gray-600 mt-2 text-center">
              Attempting to reconnect... ({reconnectingTime}s)
            </p>
            <p className="text-gray-500 text-sm mt-4 text-center">
              Please check your internet connection
            </p>
          </>
        ) : (
          <p className="mt-4 text-gray-800 font-medium">Reconnected! Loading your data...</p>
        )}
      </div>
    </div>
  );
};

export default NetworkStatus;
