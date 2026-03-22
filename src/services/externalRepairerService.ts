import apiClient from './apiClient';

// Types
export interface ExternalRepairer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  specialization: string[];
  isActive: boolean;
  totalRepairs: number;
  completedRepairs: number;
  createdAt: string;
  updatedAt: string;
}

export interface RepairAssignment {
  id: string;
  repairId: string;
  repairerId: string;
  assignedBy: string;
  status: RepairAssignmentStatus;
  notes?: string;
  expectedReturn?: string;
  assignedAt: string;
  completedAt?: string;
  repair: any;
  repairer: {
    firstName: string;
    lastName: string;
    email: string;
    businessName?: string;
  };
  statusUpdates: RepairStatusUpdate[];
}

export interface RepairStatusUpdate {
  id: string;
  assignmentId: string;
  status: RepairAssignmentStatus;
  notes?: string;
  images: string[];
  createdAt: string;
}

export enum RepairAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  COMPLETED = 'COMPLETED',
  RETURNED = 'RETURNED',
}

export interface CreateExternalRepairerDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  businessName?: string;
  specialization?: string[];
}

export interface UpdateExternalRepairerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  businessName?: string;
  specialization?: string[];
  isActive?: boolean;
}

export interface AssignRepairDto {
  repairerId: string;
  notes?: string;
  expectedReturn?: string;
}

export interface UpdateRepairStatusDto {
  status: RepairAssignmentStatus;
  notes?: string;
  images?: string[];
}

// Service
export const externalRepairerService = {
  /**
   * Create a new external repairer
   */
  create: async (data: CreateExternalRepairerDto): Promise<ExternalRepairer> => {
    const response = await apiClient.post('/external-repairers', data);
    return response.data;
  },

  /**
   * Get all external repairers
   */
  getAll: async (activeOnly: boolean = false): Promise<ExternalRepairer[]> => {
    const response = await apiClient.get('/external-repairers', {
      params: { activeOnly },
    });
    return response.data;
  },

  /**
   * Get a single external repairer by ID
   */
  getById: async (id: string): Promise<ExternalRepairer> => {
    const response = await apiClient.get(`/external-repairers/${id}`);
    return response.data;
  },

  /**
   * Update an external repairer
   */
  update: async (id: string, data: UpdateExternalRepairerDto): Promise<ExternalRepairer> => {
    const response = await apiClient.put(`/external-repairers/${id}`, data);
    return response.data;
  },

  /**
   * Deactivate an external repairer
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/external-repairers/${id}`);
    return response.data;
  },

  /**
   * Assign a repair to an external repairer
   */
  assignRepair: async (repairId: string, data: AssignRepairDto): Promise<RepairAssignment> => {
    const response = await apiClient.post(`/external-repairers/repairs/${repairId}/assign`, data);
    return response.data;
  },

  /**
   * Get statistics for external repairers
   */
  getStats: async (): Promise<{
    totalRepairers: number;
    activeRepairers: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
  }> => {
    const repairers = await externalRepairerService.getAll();

    const stats = {
      totalRepairers: repairers.length,
      activeRepairers: repairers.filter(r => r.isActive).length,
      totalAssignments: repairers.reduce((sum, r) => sum + r.totalRepairs, 0),
      completedAssignments: repairers.reduce((sum, r) => sum + r.completedRepairs, 0),
      pendingAssignments: repairers.reduce((sum, r) => sum + (r.totalRepairs - r.completedRepairs), 0),
    };

    return stats;
  },
};

/**
 * Repairer Portal Service - for use in the repairer portal application
 */
export const repairerPortalService = {
  /**
   * Login as a repairer
   */
  login: async (email: string, password: string): Promise<{ access_token: string; repairer: ExternalRepairer }> => {
    const response = await apiClient.post('/repairer-portal/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Get all repairs assigned to the logged-in repairer
   */
  getMyRepairs: async (status?: RepairAssignmentStatus): Promise<RepairAssignment[]> => {
    const response = await apiClient.get('/repairer-portal/my-repairs', {
      params: { status },
    });
    return response.data;
  },

  /**
   * Get details of a specific assignment
   */
  getAssignmentDetails: async (assignmentId: string): Promise<RepairAssignment> => {
    const response = await apiClient.get(`/repairer-portal/assignments/${assignmentId}`);
    return response.data;
  },

  /**
   * Update repair status
   */
  updateRepairStatus: async (assignmentId: string, data: UpdateRepairStatusDto): Promise<RepairStatusUpdate> => {
    const response = await apiClient.post(
      `/repairer-portal/assignments/${assignmentId}/update-status`,
      data
    );
    return response.data;
  },
};
