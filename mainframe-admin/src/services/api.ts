import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mf_admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mf_admin_token');
      localStorage.removeItem('mf_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// ── Auth ────────────────────────────────────────────────────────────────────
export const mainframeAdminApi = {
  login: (email: string, password: string) =>
    apiClient.post('/mainframe/admins/login', { email, password }),
  getAdmins: () => apiClient.get('/mainframe/admins'),
  createAdmin: (data: any) => apiClient.post('/mainframe/admins', data),
};

// ── Customer Profiles ────────────────────────────────────────────────────────
export const customerProfilesApi = {
  getAll:      (params?: any)           => apiClient.get('/mainframe/customer-profiles', { params }),
  getById:     (id: string)             => apiClient.get(`/mainframe/customer-profiles/${id}`),
  create:      (data: any)              => apiClient.post('/mainframe/customer-profiles', data),
  update:      (id: string, data: any)  => apiClient.put(`/mainframe/customer-profiles/${id}`, data),
  updateStatus:(id: string, status: string) =>
    apiClient.put(`/mainframe/customer-profiles/${id}/status`, { status }),
  getStats:    ()                       => apiClient.get('/mainframe/customer-profiles/stats'),
  getFeatures: (id: string)             => apiClient.get(`/mainframe/customer-profiles/${id}/features`),
  updateFeature:(id: string, featureId: string, data: any) =>
    apiClient.put(`/mainframe/customer-profiles/${id}/features/${featureId}`, data),
  getActivity: (id: string)             => apiClient.get(`/mainframe/customer-profiles/${id}/activity`),
  batchUpdateFeatures: (id: string, features: { featureId: string; isEnabled: boolean }[]) =>
    apiClient.put(`/mainframe/customer-profiles/${id}/features/batch`, { features }),
  delete: (id: string) => apiClient.delete(`/mainframe/customer-profiles/${id}`),
  reprovision:   (id: string) => apiClient.post(`/mainframe/customer-profiles/${id}/reprovision`),
  sendWelcome:   (id: string) => apiClient.post(`/mainframe/customer-profiles/${id}/send-welcome`),
  updateTesterFlags: (id: string, data: { isAlphaTester?: boolean; isBetaTester?: boolean; betaExpiresAt?: string | null }) =>
    apiClient.put(`/mainframe/customer-profiles/${id}/tester-flags`, data),
  getBetaExpiring: () => apiClient.get('/mainframe/customer-profiles/beta-expiring'),
  sendOnboardingEmail: (id: string) => apiClient.post(`/mainframe/customer-profiles/${id}/send-onboarding-email`),
};

// ── Customer Users ───────────────────────────────────────────────────────────
export const customerUsersApi = {
  getByProfile:     (profileId: string)    => apiClient.get(`/mainframe/customer-users/profile/${profileId}`),
  create:           (data: any)            => apiClient.post('/mainframe/customer-users', data),
  update:           (id: string, data: any)=> apiClient.put(`/mainframe/customer-users/${id}`, data),
  resetPassword:    (id: string)           => apiClient.post(`/mainframe/customer-users/${id}/reset-password`),
  getPasswordHistory:(id: string)          => apiClient.get(`/mainframe/customer-users/${id}/password-history`),
  delete:           (id: string)           => apiClient.delete(`/mainframe/customer-users/${id}`),
};

// ── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionsApi = {
  getStats:       ()                      => apiClient.get('/mainframe/subscriptions/stats'),
  getByProfile:   (profileId: string)     => apiClient.get(`/mainframe/subscriptions/profile/${profileId}`),
  updatePlan:     (profileId: string, data: any) =>
    apiClient.put(`/mainframe/subscriptions/profile/${profileId}/plan`, data),
  cancel:         (profileId: string)     => apiClient.post(`/mainframe/subscriptions/profile/${profileId}/cancel`),
  generateInvoice:(profileId: string)     => apiClient.post(`/mainframe/subscriptions/profile/${profileId}/generate-invoice`),
  getInvoices:    (profileId: string)     => apiClient.get(`/mainframe/subscriptions/profile/${profileId}/invoices`),
  markInvoicePaid:(invoiceId: string)     => apiClient.post(`/mainframe/subscriptions/invoices/${invoiceId}/mark-paid`),
  sendOffer:      (data: any)             => apiClient.post('/mainframe/subscriptions/send-offer', data),
  sendDevInvoice: (data: any)             => apiClient.post('/mainframe/subscriptions/send-dev-invoice', data),
};

// ── Features ─────────────────────────────────────────────────────────────────
export const featuresApi = {
  getAll:       (params?: any)            => apiClient.get('/mainframe/features', { params }),
  getById:      (id: string)              => apiClient.get(`/mainframe/features/${id}`),
  create:       (data: any)              => apiClient.post('/mainframe/features', data),
  update:       (id: string, data: any)  => apiClient.put(`/mainframe/features/${id}`, data),
  promote:      (id: string)             => apiClient.post(`/mainframe/features/${id}/promote`),
  addVersion:   (id: string, data: any)  => apiClient.post(`/mainframe/features/${id}/versions`, data),
  seedDefaults: ()                       => apiClient.post('/mainframe/features/seed-defaults'),
};

// ── Bug Reports ───────────────────────────────────────────────────────────────
export const bugReportsApi = {
  getAll:      (params?: any)            => apiClient.get('/mainframe/bug-reports', { params }),
  getById:     (id: string)              => apiClient.get(`/mainframe/bug-reports/${id}`),
  create:      (data: any)              => apiClient.post('/mainframe/bug-reports', data),
  update:      (id: string, data: any)  => apiClient.put(`/mainframe/bug-reports/${id}`, data),
  updateStatus:(id: string, status: string, resolution?: string) =>
    apiClient.put(`/mainframe/bug-reports/${id}/status`, { status, resolution }),
  getStats:    ()                       => apiClient.get('/mainframe/bug-reports/stats'),
};

// ── Feature Requests ──────────────────────────────────────────────────────────
export const featureRequestsApi = {
  getAll:       (params?: any)           => apiClient.get('/mainframe/feature-requests', { params }),
  getById:      (id: string)             => apiClient.get(`/mainframe/feature-requests/${id}`),
  create:       (data: any)             => apiClient.post('/mainframe/feature-requests', data),
  vote:         (id: string)            => apiClient.post(`/mainframe/feature-requests/${id}/vote`),
  updateStatus: (id: string, status: string, estimatedRelease?: string) =>
    apiClient.put(`/mainframe/feature-requests/${id}/status`, { status, estimatedRelease }),
};

// ── Subdomain ─────────────────────────────────────────────────────────────────
export const subdomainApi = {
  validate: (subdomain: string) =>
    apiClient.get(`/mainframe/customer-profiles/check-subdomain/${subdomain}`),
  suggest: (businessName: string) =>
    apiClient.get('/mainframe/customer-profiles/suggest-subdomain', { params: { businessName } }),
};

// ── Roadmap ───────────────────────────────────────────────────────────────────
export const roadmapApi = {
  getAll:  (params?: any)            => apiClient.get('/mainframe/roadmap', { params }),
  create:  (data: any)              => apiClient.post('/mainframe/roadmap', data),
  update:  (id: string, data: any)  => apiClient.put(`/mainframe/roadmap/${id}`, data),
  delete:  (id: string)             => apiClient.delete(`/mainframe/roadmap/${id}`),
};

// ── Admins ────────────────────────────────────────────────────────────────────
export const adminsApi = {
  getAll:  ()                       => apiClient.get('/mainframe/admins'),
  create:  (data: any)              => apiClient.post('/mainframe/admins', data),
  update:  (id: string, data: any)  => apiClient.put(`/mainframe/admins/${id}`, data),
};

// ── Onboarding (public — no auth token needed) ───────────────────────────────
export const onboardingApi = {
  getForm: (token: string) =>
    apiClient.get(`/mainframe/onboarding/${token}`),
  submitForm: (
    token: string,
    data: {
      tradingName?: string;
      vatNumber?: string;
      businessAddress: string;
      city: string;
      postalCode: string;
      country?: string;
      businessPhone?: string;
      termsAccepted: boolean;
    },
  ) => apiClient.post(`/mainframe/onboarding/${token}/submit`, data),
};

// ── Backup ────────────────────────────────────────────────────────────────────
export const backupApi = {
  getStatus:       ()                    => apiClient.get('/mainframe/backup/status'),
  listFiles:       ()                    => apiClient.get('/mainframe/backup/list'),
  backupMainframe: (toDrive = false)     => apiClient.post(`/mainframe/backup/mainframe-db?drive=${toDrive}`, {}, { responseType: toDrive ? 'json' : 'blob' }),
  backupPosFull:   (toDrive = false)     => apiClient.post(`/mainframe/backup/pos-full?drive=${toDrive}`, {}, { responseType: toDrive ? 'json' : 'blob' }),
  backupTenant:    (slug: string, toDrive = false) =>
    apiClient.post(`/mainframe/backup/pos-tenant/${slug}?drive=${toDrive}`, {}, { responseType: toDrive ? 'json' : 'blob' }),
  deleteFile:      (filename: string)    => apiClient.delete(`/mainframe/backup/${filename}`),
};
