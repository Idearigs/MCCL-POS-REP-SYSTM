/**
 * Module 1 — Frontend Auth Tests
 * 1.11 Login form submits all three fields and calls context login()
 * 1.12 Shows Zod validation errors when fields are empty
 * 1.13 Stays on login page when credentials are rejected
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Context mocks ──────────────────────────────────────────────────────────

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockReloadFeatures = vi.fn();

// Default: not authenticated, not loading
const buildAuthCtx = (overrides: Partial<{
  isAuthenticated: boolean;
  loading: boolean;
}> = {}) => ({
  auth: {
    user: null,
    isAuthenticated: overrides.isAuthenticated ?? false,
    tenantInfo: { status: null },
    subscription: { plan: 'basic', status: 'active', startDate: '', endDate: '', price: 0 },
    notifications: [],
    loading: overrides.loading ?? false,
    error: null,
  },
  login: mockLogin,
  logout: mockLogout,
  register: vi.fn(),
  changePassword: vi.fn(),
  updateSubscription: vi.fn(),
  renewSubscription: vi.fn(),
  addNotification: vi.fn(),
  markNotificationAsRead: vi.fn(),
  clearNotification: vi.fn(),
  refreshTenantStatus: vi.fn(),
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => buildAuthCtx(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/FeatureContext', () => ({
  useFeatures: () => ({ reload: mockReloadFeatures, features: [] }),
  FeatureProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Suppress toast calls in tests
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Suppress intro animation
vi.mock('@/components/ui/intro-animation', () => ({
  default: () => null,
}));

// ── Import the component under test ───────────────────────────────────────

import Login from '@/pages/Login';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>
  );
}

async function fillAndSubmit(
  email: string,
  password: string,
  company: string,
) {
  const user = userEvent.setup();
  // Find inputs by placeholder or label — inspect what's rendered
  const emailInput = screen.getByPlaceholderText(/email/i);
  const passwordInput = screen.getByPlaceholderText(/password/i);
  const companyInput = screen.getByPlaceholderText(/company|code/i);
  const submitBtn = screen.getByRole('button', { name: /sign in|login/i });

  if (email) await user.type(emailInput, email);
  if (password) await user.type(passwordInput, password);
  if (company) await user.type(companyInput, company);
  await user.click(submitBtn);
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login — 1.11: form submission', () => {
  it('calls context login() with email, password, and company slug', async () => {
    mockLogin.mockResolvedValue(true);
    renderLogin();

    await fillAndSubmit('admin@test.com', 'secret123', 'demo-store');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'secret123', 'demo-store');
    });
  });
});

describe('Login — 1.12: Zod validation errors', () => {
  it('shows validation error when email field is empty', async () => {
    renderLogin();
    const user = userEvent.setup();

    // Submit without typing anything
    await user.click(screen.getByRole('button', { name: /sign in|login/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('shows validation error when password field is empty', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/email/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText(/company|code/i), 'myco');
    await user.click(screen.getByRole('button', { name: /sign in|login/i }));

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows validation error when company code is empty', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/email/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /sign in|login/i }));

    expect(await screen.findByText(/company code is required/i)).toBeInTheDocument();
  });
});

describe('Login — 1.13: wrong credentials stay on page', () => {
  it('does not navigate away when login() returns false', async () => {
    mockLogin.mockResolvedValue(false);
    renderLogin();

    await fillAndSubmit('admin@test.com', 'wrong', 'demo-store');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    // Login form should still be on screen
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
});
