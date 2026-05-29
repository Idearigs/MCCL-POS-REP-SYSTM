/**
 * Module 1 — PrivateRoute Tests
 * 1.14 Unauthenticated user is redirected to /login
 * 1.15 Authenticated user sees protected content
 * 1.16 SUSPENDED tenant sees TenantSuspendedScreen (not login redirect)
 * 1.17 STAFF role is redirected away from admin paths
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// ── Base auth state factory ────────────────────────────────────────────────

type AuthOverride = {
  isAuthenticated?: boolean;
  loading?: boolean;
  role?: string;
  tenantStatus?: string | null;
};

function buildAuthCtx(o: AuthOverride = {}) {
  return {
    auth: {
      user: o.isAuthenticated
        ? { id: 'u1', name: 'Test', email: 'a@b.com', role: o.role ?? 'ADMIN' }
        : null,
      isAuthenticated: o.isAuthenticated ?? false,
      tenantInfo: {
        status: o.tenantStatus ?? (o.isAuthenticated ? 'ACTIVE' : null),
        suspendedReason: o.tenantStatus === 'SUSPENDED' ? 'MANUAL' : null,
      },
      subscription: { plan: 'basic', status: 'active', startDate: '', endDate: '', price: 0 },
      notifications: [],
      loading: o.loading ?? false,
      error: null,
    },
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    changePassword: vi.fn(),
    updateSubscription: vi.fn(),
    renewSubscription: vi.fn(),
    addNotification: vi.fn(),
    markNotificationAsRead: vi.fn(),
    clearNotification: vi.fn(),
    refreshTenantStatus: vi.fn(),
  };
}

// ── Mock AuthContext (overridden per test via module-level state) ──────────

let ctxValue = buildAuthCtx();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ctxValue,
}));

// TenantSuspendedScreen just needs to render something identifiable
vi.mock('@/components/auth/TenantSuspendedScreen', () => ({
  default: () => <div data-testid="suspended-screen">Account Suspended</div>,
}));

// ── Import after mocks ─────────────────────────────────────────────────────

import PrivateRoute from '@/components/auth/PrivateRoute';

// ── Render helper ──────────────────────────────────────────────────────────

function renderWithRoutes(
  initialPath: string,
  auth: AuthOverride = {},
) {
  ctxValue = buildAuthCtx(auth);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/pos" element={<div>POS Page</div>} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <div>Dashboard Content</div>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <div>Settings Content</div>
            </PrivateRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PrivateRoute — 1.14: unauthenticated redirect', () => {
  it('redirects to /login when user is not authenticated', () => {
    renderWithRoutes('/dashboard', { isAuthenticated: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});

describe('PrivateRoute — 1.15: authenticated access', () => {
  it('renders protected content for an authenticated ADMIN user', () => {
    renderWithRoutes('/dashboard', { isAuthenticated: true, role: 'ADMIN' });
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});

describe('PrivateRoute — 1.16: suspended tenant', () => {
  it('shows TenantSuspendedScreen (not login) when tenant is SUSPENDED', () => {
    renderWithRoutes('/dashboard', {
      isAuthenticated: true,
      tenantStatus: 'SUSPENDED',
    });

    expect(screen.getByTestId('suspended-screen')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});

describe('PrivateRoute — 1.17: STAFF role restriction', () => {
  it('redirects STAFF user from /settings to /pos', () => {
    renderWithRoutes('/settings', { isAuthenticated: true, role: 'STAFF' });
    expect(screen.getByText('POS Page')).toBeInTheDocument();
    expect(screen.queryByText('Settings Content')).not.toBeInTheDocument();
  });

  it('allows STAFF user to access /pos', () => {
    ctxValue = buildAuthCtx({ isAuthenticated: true, role: 'STAFF' });
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route
            path="/pos"
            element={
              <PrivateRoute>
                <div>POS Content</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('POS Content')).toBeInTheDocument();
  });
});
