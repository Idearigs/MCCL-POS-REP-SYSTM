
import React, { useEffect, useRef, useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import NetworkStatus from '@/components/ui/network-status';
import GlobalNotificationIndicator from '@/components/notifications/GlobalNotificationIndicator';
import FloatingShiftButton from '@/components/shifts/FloatingShiftButton';
import { ChatWidget } from '@/components/chatbot/ChatWidget';
import BillingWarningBanner from '@/components/auth/BillingWarningBanner';
import { usePrinterDetection } from '@/hooks/usePrinterDetection';
import { PrinterSelectorDialog } from '@/components/printer/PrinterSelectorDialog';

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  hasPaymentWarning?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pageTitle, hasPaymentWarning = false }) => {
  const { auth } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const printerDetection = usePrinterDetection();
  const detectionRan = useRef(false);

  useEffect(() => {
    const hasWarningNotification = auth.notifications.some(
      notification =>
        (notification.type === 'payment' && notification.title === 'Payment Warning') ||
        (notification.type === 'payment' && notification.title === 'Payment Due'),
    );
    setShowWarning(hasPaymentWarning || hasWarningNotification);
  }, [auth.notifications, hasPaymentWarning]);

  // Run printer detection once per session after login
  useEffect(() => {
    if (detectionRan.current || !auth.isAuthenticated) return;
    detectionRan.current = true;
    // Delay so QZ Tray has time to handshake after page load
    const t = setTimeout(() => { printerDetection.scan(); }, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  return (
    <NetworkStatus>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background relative transition-colors duration-200">
          <GlobalNotificationIndicator />
          <FloatingShiftButton />
          <ChatWidget />

          {/* Global printer selector — shown when multiple/replacement printers detected */}
          <PrinterSelectorDialog
            open={printerDetection.showSelector}
            printers={printerDetection.selectorPrinters}
            mode={printerDetection.selectorMode}
            missingPrinter={printerDetection.missingPrinter}
            onSelect={printerDetection.confirmSelect}
            onDismiss={printerDetection.dismiss}
          />

          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <BillingWarningBanner tenantInfo={auth.tenantInfo} />
            <Header pageTitle={pageTitle} hasPaymentWarning={showWarning} />
            <main className="flex-1 overflow-y-auto p-4 bg-background transition-colors duration-200">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </NetworkStatus>
  );
};

export default MainLayout;
