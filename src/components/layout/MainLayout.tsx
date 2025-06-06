
import React, { useEffect, useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import NetworkStatus from '@/components/ui/network-status';
import GlobalNotificationIndicator from '@/components/notifications/GlobalNotificationIndicator';

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  hasPaymentWarning?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pageTitle, hasPaymentWarning = false }) => {
  const { auth } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  
  // Always check for any notifications that should trigger warnings
  useEffect(() => {
    // Check for payment warnings or any other important notifications
    const hasWarningNotification = auth.notifications.some(
      notification => (
        // Check for payment warning notifications
        (notification.type === 'payment' && notification.title === 'Payment Warning') ||
        // Also check for payment due notifications
        (notification.type === 'payment' && notification.title === 'Payment Due')
      )
    );
    
    // Set warning state based on props or existing notifications
    setShowWarning(hasPaymentWarning || hasWarningNotification);
  }, [auth.notifications, hasPaymentWarning]);
  return (
    <NetworkStatus>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-gray-50 relative">
          {/* Add GlobalNotificationIndicator at the top level */}
          <GlobalNotificationIndicator />
          
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header pageTitle={pageTitle} hasPaymentWarning={showWarning} />
            <main className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-white">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </NetworkStatus>
  );
};

export default MainLayout;
