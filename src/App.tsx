
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PageTransition from "@/components/ui/page-transition";
import { AuthProvider } from "./contexts/AuthContext";
import { FeatureProvider } from "./contexts/FeatureContext";
import { TransactionProvider } from "./contexts/TransactionContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import { InventoryProvider } from "./contexts/InventoryContext";
import { RepairMessagesProvider } from "./contexts/RepairMessagesContext";
import { RepairTagsProvider } from "./contexts/RepairTagsContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import PrivateRoute from "./components/auth/PrivateRoute";
import PermissionGuard from "./components/auth/PermissionGuard";
import FeatureGuard from "./components/auth/FeatureGuard";
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
import { StockTakingPage } from "./pages/StockTakingPage";
import { UsersPage } from "./pages/UsersPage";
import CustomerSelfRegistration from "./pages/CustomerSelfRegistration";
import CashUpPage from "./pages/CashUpPage";
import FloatManagementPage from "./pages/FloatManagementPage";
import TasksPage from "./pages/TasksPage";
import PettyCashPage from "./pages/PettyCashPage";
import ShiftsPage from "./pages/ShiftsPage";
import FinancialIntelligencePage from "./pages/FinancialIntelligencePage";
import MobileAddProduct from "./pages/MobileAddProduct";
import MobileAddRepair from "./pages/MobileAddRepair";

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
        <FeatureProvider>
        <SettingsProvider>
          <TransactionProvider>
            <CustomerProvider>
              <InventoryProvider>
                <RepairMessagesProvider>
                  <RepairTagsProvider>
                    <TooltipProvider>
              <Toaster />
              <Sonner />
              <PageTransition>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<CustomerSelfRegistration />} />

                  {/* Protected routes - require authentication */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="dashboard">
                          <Index />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/pos"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="pos">
                          <PointOfSale />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/repairs"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="repairs">
                          <RepairsPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="tasks" pageTitle="Tasks">
                          <TasksPage />
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="customers">
                          <CustomersPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/inventory"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="inventory">
                          <InventoryPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/stock-taking"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="stock_taking" pageTitle="Stock Taking">
                          <PermissionGuard permission="stockTaking">
                            <StockTakingPage />
                          </PermissionGuard>
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="sales">
                          <SalesPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/cashiers"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="cashiers">
                          <CashiersPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="userManagement">
                          <UsersPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="calendar" pageTitle="Calendar">
                          <PermissionGuard permission="calendar">
                            <CalendarPage />
                          </PermissionGuard>
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="history" pageTitle="History">
                          <PermissionGuard permission="history">
                            <HistoryPage />
                          </PermissionGuard>
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/search"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="search">
                          <SearchPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="settings">
                          <SettingsPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/subscription"
                    element={
                      <PrivateRoute>
                        <PermissionGuard permission="subscription">
                          <SubscriptionPage />
                        </PermissionGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/financial-intelligence"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="financial_intelligence" pageTitle="Financial Intelligence">
                          <PermissionGuard permission="financial_intelligence">
                            <FinancialIntelligencePage />
                          </PermissionGuard>
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                  <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
                  <Route path="/api-test" element={<PrivateRoute><ApiTestPage /></PrivateRoute>} />
                  <Route path="/admin" element={<PrivateRoute><AdminManagement /></PrivateRoute>} />
                  <Route
                    path="/cash-up"
                    element={
                      <PrivateRoute>
                        <CashUpPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/float"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="float_management" pageTitle="Float Management">
                          <PermissionGuard permission="floatManagement">
                            <FloatManagementPage />
                          </PermissionGuard>
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/petty-cash"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="petty_cash" pageTitle="Petty Cash">
                          <PermissionGuard permission="pettyCash">
                            <PettyCashPage />
                          </PermissionGuard>
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/shifts"
                    element={
                      <PrivateRoute>
                        <FeatureGuard feature="shifts" pageTitle="Shifts">
                          <ShiftsPage />
                        </FeatureGuard>
                      </PrivateRoute>
                    }
                  />

                  {/* Mobile routes (standalone, no MainLayout) */}
                  <Route path="/mobile/add-product" element={<PrivateRoute><MobileAddProduct /></PrivateRoute>} />
                  <Route path="/mobile/add-repair" element={<PrivateRoute><MobileAddRepair /></PrivateRoute>} />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
                    </TooltipProvider>
                  </RepairTagsProvider>
                </RepairMessagesProvider>
              </InventoryProvider>
            </CustomerProvider>
          </TransactionProvider>
        </SettingsProvider>
        </FeatureProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
