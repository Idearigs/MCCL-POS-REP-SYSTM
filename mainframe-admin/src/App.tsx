import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import MainFrameDashboard from './pages/MainFrameDashboard';
import DevPortalPage from './pages/DevPortalPage';
import OnboardingPage from './pages/OnboardingPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import StagingBadge from './components/StagingBadge';
import './index.css';

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public — no auth required */}
      <Route path="/onboarding/:token" element={<OnboardingPage />} />

      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainFrameDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dev-portal"
        element={
          <ProtectedRoute>
            <DevPortalPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <StagingBadge />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
