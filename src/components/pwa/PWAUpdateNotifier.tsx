import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAUpdateNotifier: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registered:', r);
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });

  // On the login page, auto-apply updates immediately — the user hasn't started
  // a session yet so there's nothing to lose by reloading.
  useEffect(() => {
    if (needRefresh && window.location.pathname === '/login') {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Show update notification
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
        <Card className="border-2 border-blue-500 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Update Available</CardTitle>
            </div>
            <CardDescription>
              A new version of MCCL POS is available
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              onClick={handleUpdate}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Now
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Later
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show offline ready notification
  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
        <Card className="border-2 border-green-500 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-green-500">✓</span>
              App Ready to Work Offline
            </CardTitle>
            <CardDescription>
              MCCL POS is now available offline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Got it
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default PWAUpdateNotifier;
