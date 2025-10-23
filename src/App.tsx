
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PageTransition from "@/components/ui/page-transition";
import { AuthProvider } from "./contexts/AuthContext";
import { TransactionProvider } from "./contexts/TransactionContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import { InventoryProvider } from "./contexts/InventoryContext";
import PrivateRoute from "./components/auth/PrivateRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/MainLayout";
import PointOfSale from "./pages/PointOfSale";
import RepairsPage from "./pages/RepairsPage";
import CustomersPage from "./pages/CustomersPage";
import InventoryPage from "./pages/InventoryPage";
import CalendarPage from "./pages/CalendarPage";
import HistoryPage from "./pages/HistoryPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import SubscriptionPage from "./pages/SubscriptionPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import ApiTestPage from "./components/ApiTestPage";
import AdminManagement from "./pages/AdminManagement";
import SalesPage from "./pages/SalesPage";
import CashiersPage from "./pages/CashiersPage";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";
import OfflineIndicator from "./components/pwa/OfflineIndicator";
import PWAUpdateNotifier from "./components/pwa/PWAUpdateNotifier";

// Create a client for React Query
const queryClient = new QueryClient();

// Placeholder components for routes that don't have dedicated pages yet
const PlaceholderPage = ({ title }: { title: string }) => (
  <MainLayout pageTitle={title}>
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{title} Page</h1>
        <p className="text-muted-foreground">This page is under development.</p>
      </div>
    </div>
  </MainLayout>
);

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TransactionProvider>
          <CustomerProvider>
            <InventoryProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {/* PWA Components */}
              <PWAInstallPrompt />
              <OfflineIndicator />
              <PWAUpdateNotifier />
              <PageTransition>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected routes - require authentication */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<PrivateRoute><Index /></PrivateRoute>} />
                  <Route path="/pos" element={<PrivateRoute><PointOfSale /></PrivateRoute>} />
                  <Route path="/repairs" element={<PrivateRoute><RepairsPage /></PrivateRoute>} />
                  <Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
                  <Route path="/inventory" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
                  <Route path="/sales" element={<PrivateRoute><SalesPage /></PrivateRoute>} />
                  <Route path="/cashiers" element={<PrivateRoute><CashiersPage /></PrivateRoute>} />
                  <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
                  <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
                  <Route path="/search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
                  <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                  <Route path="/subscription" element={<PrivateRoute><SubscriptionPage /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                  <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
                  <Route path="/api-test" element={<PrivateRoute><ApiTestPage /></PrivateRoute>} />
                  <Route path="/admin" element={<PrivateRoute><AdminManagement /></PrivateRoute>} />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            </TooltipProvider>
            </InventoryProvider>
          </CustomerProvider>
        </TransactionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
