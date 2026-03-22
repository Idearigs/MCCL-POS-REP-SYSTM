import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mf_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mf_admin_token');
      localStorage.removeItem('mf_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// MainFrame Admin API
export const mainframeAdminApi = {
  login: (email: string, password: string) =>
    apiClient.post('/mainframe/admins/login', { email, password }),

  getAdmins: () => apiClient.get('/mainframe/admins'),

  createAdmin: (data: any) => apiClient.post('/mainframe/admins', data),
};

// Customer Profiles API
export const customerProfilesApi = {
  getAll: (params?: any) => apiClient.get('/mainframe/customer-profiles', { params }),

  getById: (id: string) => apiClient.get(`/mainframe/customer-profiles/${id}`),

  create: (data: any) => apiClient.post('/mainframe/customer-profiles', data),

  update: (id: string, data: any) => apiClient.put(`/mainframe/customer-profiles/${id}`, data),

  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/mainframe/customer-profiles/${id}/status`, { status }),

  getStats: () => apiClient.get('/mainframe/customer-profiles/stats'),
};

// Subscriptions API
export const subscriptionsApi = {
  getByProfile: (profileId: string) =>
    apiClient.get(`/mainframe/subscriptions/profile/${profileId}`),

  updatePlan: (profileId: string, data: any) =>
    apiClient.put(`/mainframe/subscriptions/profile/${profileId}/plan`, data),

  generateInvoice: (profileId: string) =>
    apiClient.post(`/mainframe/subscriptions/profile/${profileId}/generate-invoice`),

  getStats: () => apiClient.get('/mainframe/subscriptions/stats'),
};

// Features API
export const featuresApi = {
  getAll: () => apiClient.get('/mainframe/features'),

  create: (data: any) => apiClient.post('/mainframe/features', data),

  seedDefaults: () => apiClient.post('/mainframe/features/seed-defaults'),
};

// Bug Reports API
export const bugReportsApi = {
  getAll: (params?: any) => apiClient.get('/mainframe/bug-reports', { params }),

  create: (data: any) => apiClient.post('/mainframe/bug-reports', data),

  updateStatus: (id: string, status: string, resolution?: string) =>
    apiClient.put(`/mainframe/bug-reports/${id}/status`, { status, resolution }),

  getStats: () => apiClient.get('/mainframe/bug-reports/stats'),
};

// Feature Requests API
export const featureRequestsApi = {
  getAll: () => apiClient.get('/mainframe/feature-requests'),

  create: (data: any) => apiClient.post('/mainframe/feature-requests', data),

  vote: (id: string) => apiClient.post(`/mainframe/feature-requests/${id}/vote`),
};

// Subdomain API
export const subdomainApi = {
  validate: (subdomain: string) =>
    apiClient.get(`/mainframe/customer-profiles/check-subdomain/${subdomain}`),

  suggest: (businessName: string) =>
    apiClient.get('/mainframe/customer-profiles/suggest-subdomain', {
      params: { businessName }
    }),
};
