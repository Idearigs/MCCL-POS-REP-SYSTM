import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Clock, PlayCircle, Loader2, Zap } from 'lucide-react';
import TileBasedPOS from '@/components/pos/TileBasedPOS';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { shiftService, Shift } from '@/services/shiftService';
import StartShiftDialog from '@/components/shifts/StartShiftDialog';
import CloseShiftDialog from '@/components/shifts/CloseShiftDialog';

const PointOfSale = () => {
  // Shift management state
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isStartShiftDialogOpen, setIsStartShiftDialogOpen] = useState(false);
  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(true);

  // Quick POS state - automatically open when shift is active
  const [isQuickPOSOpen, setIsQuickPOSOpen] = useState(false);

  // Load active shift on component mount
  useEffect(() => {
    loadActiveShift();
  }, []);

  // Automatically open Quick POS when shift becomes active
  useEffect(() => {
    if (activeShift && !shiftLoading) {
      setIsQuickPOSOpen(true);
      // Notify FloatingShiftButton that Quick POS is open
      window.dispatchEvent(new Event('quickPOSOpened'));
    }
  }, [activeShift, shiftLoading]);

  // Listen for Quick POS toggle events from FloatingShiftButton
  useEffect(() => {
    const handleQuickPOSOpened = () => {
      setIsQuickPOSOpen(true);
    };

    const handleQuickPOSClosed = () => {
      setIsQuickPOSOpen(false);
    };

    window.addEventListener('quickPOSOpened', handleQuickPOSOpened);
    window.addEventListener('quickPOSClosed', handleQuickPOSClosed);

    return () => {
      window.removeEventListener('quickPOSOpened', handleQuickPOSOpened);
      window.removeEventListener('quickPOSClosed', handleQuickPOSClosed);
    };
  }, []);

  const loadActiveShift = async () => {
    try {
      setShiftLoading(true);
      const shift = await shiftService.getActiveShift();
      setActiveShift(shift);
    } catch (error) {
      console.error('Error loading active shift:', error);
      // No active shift is okay, user can start one
    } finally {
      setShiftLoading(false);
    }
  };

  const handleShiftStarted = (shift: Shift) => {
    setActiveShift(shift);
    toast({
      title: 'Shift Started',
      description: `Shift ${shift.shiftNumber} is now active`,
    });
    // Quick POS will open automatically via useEffect

    // Dispatch event to notify FloatingShiftButton
    window.dispatchEvent(new Event('shiftChanged'));
  };

  const handleShiftClosed = (shift: Shift) => {
    setActiveShift(null);
    setIsQuickPOSOpen(false); // Close Quick POS when shift ends
    toast({
      title: 'Shift Closed',
      description: `Shift ${shift.shiftNumber} has been closed successfully`,
    });
  };

  // Show loading state
  if (shiftLoading) {
    return (
      <MainLayout pageTitle="Point of Sale">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading shift information...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show Start Shift screen when no active shift
  if (!activeShift) {
    return (
      <MainLayout pageTitle="Point of Sale">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-6 py-12">
          <Card className="max-w-2xl w-full shadow-xl">
            <CardContent className="pt-12 pb-12 px-8 text-center">
              {/* Icon */}
              <div className="mb-6 flex justify-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Clock className="h-12 w-12 text-white" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Welcome to Point of Sale
              </h1>

              {/* Description */}
              <p className="text-lg text-gray-600 mb-8">
                Before you can start processing sales, you need to start your shift.
                This helps track your transactions and cash flow accurately.
              </p>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <span className="font-semibold text-blue-900">Count Cash</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Count all cash in your register drawer
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <span className="font-semibold text-blue-900">Start Shift</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Enter your opening float amount
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <span className="font-semibold text-blue-900">Begin Sales</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Start processing customer transactions
                  </p>
                </div>
              </div>

              {/* Start Shift Button */}
              <Button
                size="lg"
                onClick={() => setIsStartShiftDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlayCircle size={24} className="mr-3" />
                Start Your Shift
              </Button>

              {/* Help Text */}
              <p className="text-sm text-gray-500 mt-6">
                Need help? Contact your supervisor or manager.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Start Shift Dialog */}
        <StartShiftDialog
          open={isStartShiftDialogOpen}
          onClose={() => setIsStartShiftDialogOpen(false)}
          onShiftStarted={handleShiftStarted}
        />
      </MainLayout>
    );
  }

  // Show Quick Mode POS when shift is active
  return (
    <MainLayout pageTitle="Point of Sale">
      {/* Quick Mode POS - Full Screen */}
      {isQuickPOSOpen ? (
        <div className="fixed left-0 right-0 top-0 bottom-0 z-50 bg-white">
          <TileBasedPOS onClose={() => setIsCloseShiftDialogOpen(true)} />
        </div>
      ) : (
        /* Fallback: Show message if Quick POS gets closed */
        <div className="flex items-center justify-center h-full pt-24">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              <Zap className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                POS Ready
              </h2>
              <p className="text-gray-600 mb-6">
                Your shift is active. Open Quick Mode to start processing sales.
              </p>
              <Button
                size="lg"
                onClick={() => setIsQuickPOSOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Zap size={20} className="mr-2" />
                Open Quick Mode POS
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Close Shift Dialog */}
      <CloseShiftDialog
        open={isCloseShiftDialogOpen}
        onClose={() => setIsCloseShiftDialogOpen(false)}
        activeShift={activeShift}
        onShiftClosed={handleShiftClosed}
      />
    </MainLayout>
  );
};

export default PointOfSale;
