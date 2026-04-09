import { apiClient } from './apiClient';

// Types
export interface CustomerProfile {
  id: string;
  businessName: string;
  subdomain: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  databaseName?: string;
  databaseHost?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  subscription?: Subscription;
  features?: CustomerFeature[];
  users?: CustomerUser[];
}

export interface CustomerUser {
  id: string;
  customerProfileId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Feature {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  isCore: boolean;
  isPremium: boolean;
  monthlyPrice: number;
  status: 'ALPHA' | 'BETA' | 'STABLE' | 'DEPRECATED';
  currentVersion?: string;
  versions?: FeatureVersion[];
}

export interface FeatureVersion {
  id: string;
  featureId: string;
  version: string;
  changelog?: string;
  isStable: boolean;
  releasedAt: string;
}

export interface CustomerFeature {
  id: string;
  customerProfileId: string;
  featureId: string;
  isEnabled: boolean;
  enabledAt?: string;
  customConfig?: Record<string, any>;
  feature?: Feature;
}

export interface Subscription {
  id: string;
  customerProfileId: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE' | 'CUSTOM';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  isActive: boolean;
  basePrice: number;
  perUserPrice: number;
  includedUsers: number;
  maxUsers?: number;
  currentUsers: number;
  discountPercent?: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface Invoice {
  id: string;
  customerProfileId: string;
  subscriptionId: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string;
  transactionId?: string;
  lineItems: any[];
  createdAt: string;
}

export interface BugReport {
  id: string;
  customerProfileId?: string;
  reportedById?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WONT_FIX';
  featureId?: string;
  affectedVersion?: string;
  assignedToId?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  feature?: Feature;
  customerProfile?: { businessName: string };
}

export interface FeatureRequest {
  id: string;
  customerProfileId?: string;
  requestedById?: string;
  title: string;
  description: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_DEVELOPMENT' | 'COMPLETED' | 'REJECTED';
  votes: number;
  priority?: string;
  estimatedRelease?: string;
  createdAt: string;
  customerProfile?: { businessName: string };
}

export interface MainframeAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  customerProfileId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  performedById?: string;
  createdAt: string;
}

// Customer Profiles API
export const customerProfilesApi = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const response = await apiClient.get('/mainframe/customer-profiles', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/mainframe/customer-profiles/${id}`);
    return response.data;
  },

  create: async (data: {
    businessName: string;
    subdomain: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    plan?: string;
  }) => {
    const response = await apiClient.post('/mainframe/customer-profiles', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CustomerProfile>) => {
    const response = await apiClient.put(`/mainframe/customer-profiles/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string, reason?: string) => {
    const response = await apiClient.put(`/mainframe/customer-profiles/${id}/status`, { status, reason });
    return response.data;
  },

  getFeatures: async (id: string) => {
    const response = await apiClient.get(`/mainframe/customer-profiles/${id}/features`);
    return response.data;
  },

  updateFeature: async (id: string, featureId: string, data: { isEnabled: boolean; customConfig?: any }) => {
    const response = await apiClient.put(`/mainframe/customer-profiles/${id}/features/${featureId}`, data);
    return response.data;
  },

  getActivity: async (id: string) => {
    const response = await apiClient.get(`/mainframe/customer-profiles/${id}/activity`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/mainframe/customer-profiles/stats');
    return response.data;
  },
};

// Customer Users API
export const customerUsersApi = {
  getByProfile: async (profileId: string) => {
    const response = await apiClient.get(`/mainframe/customer-users/profile/${profileId}`);
    return response.data;
  },

  create: async (data: {
    customerProfileId: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    password: string;
  }) => {
    const response = await apiClient.post('/mainframe/customer-users', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CustomerUser>) => {
    const response = await apiClient.put(`/mainframe/customer-users/${id}`, data);
    return response.data;
  },

  resetPassword: async (id: string) => {
    const response = await apiClient.post(`/mainframe/customer-users/${id}/reset-password`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/mainframe/customer-users/${id}`);
    return response.data;
  },
};

// Features API
export const featuresApi = {
  getAll: async (params?: { category?: string; status?: string }) => {
    const response = await apiClient.get('/mainframe/features', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/mainframe/features/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    slug: string;
    description?: string;
    category: string;
    isCore?: boolean;
    isPremium?: boolean;
    monthlyPrice?: number;
  }) => {
    const response = await apiClient.post('/mainframe/features', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Feature>) => {
    const response = await apiClient.put(`/mainframe/features/${id}`, data);
    return response.data;
  },

  addVersion: async (id: string, data: { version: string; changelog?: string; isStable?: boolean }) => {
    const response = await apiClient.post(`/mainframe/features/${id}/versions`, data);
    return response.data;
  },

  seedDefaults: async () => {
    const response = await apiClient.post('/mainframe/features/seed-defaults');
    return response.data;
  },
};

// Subscriptions API
export const subscriptionsApi = {
  getByProfile: async (profileId: string) => {
    const response = await apiClient.get(`/mainframe/subscriptions/profile/${profileId}`);
    return response.data;
  },

  updatePlan: async (profileId: string, data: { plan: string; billingCycle?: string }) => {
    const response = await apiClient.put(`/mainframe/subscriptions/profile/${profileId}/plan`, data);
    return response.data;
  },

  cancel: async (profileId: string, reason?: string) => {
    const response = await apiClient.post(`/mainframe/subscriptions/profile/${profileId}/cancel`, { reason });
    return response.data;
  },

  generateInvoice: async (profileId: string) => {
    const response = await apiClient.post(`/mainframe/subscriptions/profile/${profileId}/generate-invoice`);
    return response.data;
  },

  getInvoices: async (profileId: string) => {
    const response = await apiClient.get(`/mainframe/subscriptions/profile/${profileId}/invoices`);
    return response.data;
  },

  markInvoicePaid: async (invoiceId: string, transactionId?: string) => {
    const response = await apiClient.post(`/mainframe/subscriptions/invoices/${invoiceId}/mark-paid`, { transactionId });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/mainframe/subscriptions/stats');
    return response.data;
  },

  sendOffer: async (data: {
    profileId: string;
    title: string;
    description: string;
    plan: string;
    checkoutUrl: string;
    features: { name: string; description: string; price: number; isCustom: boolean }[];
    confirmModal: { title: string; message: string; buttonText: string; buttonLink: string };
  }) => {
    const response = await apiClient.post('/mainframe/subscriptions/send-offer', data);
    return response.data;
  },
};

// Bug Reports API
export const bugReportsApi = {
  getAll: async (params?: { status?: string; priority?: string; featureId?: string }) => {
    const response = await apiClient.get('/mainframe/bug-reports', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/mainframe/bug-reports/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description: string;
    priority?: string;
    featureId?: string;
    affectedVersion?: string;
    customerProfileId?: string;
  }) => {
    const response = await apiClient.post('/mainframe/bug-reports', data);
    return response.data;
  },

  update: async (id: string, data: Partial<BugReport>) => {
    const response = await apiClient.put(`/mainframe/bug-reports/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string, resolution?: string) => {
    const response = await apiClient.put(`/mainframe/bug-reports/${id}/status`, { status, resolution });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/mainframe/bug-reports/stats');
    return response.data;
  },
};

// Feature Requests API
export const featureRequestsApi = {
  getAll: async (params?: { status?: string }) => {
    const response = await apiClient.get('/mainframe/feature-requests', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/mainframe/feature-requests/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description: string;
    customerProfileId?: string;
  }) => {
    const response = await apiClient.post('/mainframe/feature-requests', data);
    return response.data;
  },

  vote: async (id: string) => {
    const response = await apiClient.post(`/mainframe/feature-requests/${id}/vote`);
    return response.data;
  },

  updateStatus: async (id: string, status: string, estimatedRelease?: string) => {
    const response = await apiClient.put(`/mainframe/feature-requests/${id}/status`, { status, estimatedRelease });
    return response.data;
  },
};

// Mainframe Admins API
export const mainframeAdminsApi = {
  getAll: async () => {
    const response = await apiClient.get('/mainframe/admins');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/mainframe/admins/${id}`);
    return response.data;
  },

  create: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    const response = await apiClient.post('/mainframe/admins', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/mainframe/admins/login', { email, password });
    return response.data;
  },

  update: async (id: string, data: Partial<MainframeAdmin>) => {
    const response = await apiClient.put(`/mainframe/admins/${id}`, data);
    return response.data;
  },

  changePassword: async (id: string, password: string) => {
    const response = await apiClient.post(`/mainframe/admins/${id}/change-password`, { password });
    return response.data;
  },
};

// Subdomain API
export const subdomainApi = {
  validate: async (subdomain: string, excludeProfileId?: string) => {
    const response = await apiClient.post('/mainframe/subdomain/validate', { subdomain, excludeProfileId });
    return response.data;
  },

  suggest: async (businessName: string) => {
    const response = await apiClient.post('/mainframe/subdomain/suggest', { businessName });
    return response.data;
  },
};

// Credentials Export API
export const credentialsApi = {
  export: async (profileId: string, userId: string) => {
    const response = await apiClient.get(`/mainframe/credentials/export/${profileId}/${userId}`);
    return response.data;
  },
};
