import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast({
          title: 'Back Online',
          description: 'Your internet connection has been restored.',
          duration: 3000
        });
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast({
        title: 'No Internet Connection',
        description: 'You are currently offline. Some features may be limited.',
        variant: 'destructive',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, toast]);

  // Don't show anything when online
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
      <Badge variant="destructive" className="px-4 py-2 text-sm shadow-lg">
        <WifiOff className="mr-2 h-4 w-4" />
        Offline Mode - Some features unavailable
      </Badge>
    </div>
  );
};

export default OfflineIndicator;
