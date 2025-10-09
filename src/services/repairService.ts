// Repair Service for MPS Jewelry System
import { apiClient } from './apiClient';
import { API_CONFIG, PaginatedResponse } from '../config/api';

export interface Repair {
  id: string;
  customerId: string;
  customerName: string;
  itemDescription: string;
  problemDescription: string;
  repairType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'RECEIVED' | 'ASSESSED' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'CANCELLED';
  estimatedCost: number;
  actualCost?: number;
  estimatedCompletion?: string;
  actualCompletion?: string;
  dateReceived: string;
  dateCompleted?: string;
  notes?: string;
  images?: string[];
  assignedTo?: string;
  technicianName?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepairData {
  customerId: string;
  problemDescription: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expectedCompletionDate?: string;
  customerInstructions?: string;
  internalNotes?: string;
  depositAmount?: number;
  itemDescription?: string;
  estimatedCost?: number;
  insuranceNumber?: string;
  insuranceValue?: number;
  items: {
    productId?: string;
    itemDescription: string;
    repairType: 'CLEANING' | 'POLISHING' | 'SIZING' | 'STONE_SETTING' | 'PRONG_REPAIR' | 'CHAIN_REPAIR' | 'CLASP_REPAIR' | 'ENGRAVING' | 'RESTORATION' | 'CUSTOM_WORK' | 'OTHER';
    repairDescription: string;
    estimatedCost: number;
    actualCost?: number;
    material?: string;
    weight?: number;
    notes?: string;
  }[];
}

export interface UpdateRepairData {
  status?: 'RECEIVED' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'CANCELLED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
  itemDescription?: string;
  problemDescription?: string;
  estimatedCost?: number;
  statusNotes?: string;
  customerInstructions?: string;
  internalNotes?: string;
  totalCost?: number;
  depositAmount?: number;
  insuranceValue?: number;
  assignedTechnicianId?: string;
}

export interface RepairFilters {
  search?: string;
  customerId?: string;
  status?: string;
  priority?: string;
  repairType?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
}

export interface RepairStats {
  totalRepairs: number;
  activeRepairs: number;
  completedRepairs: number;
  overdueRepairs: number;
  averageCompletionTime: number;
  totalRevenue: number;
  repairsByStatus: Array<{
    status: string;
    count: number;
  }>;
  repairsByPriority: Array<{
    priority: string;
    count: number;
  }>;
  repairsByType: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
}

export interface RepairNote {
  id: string;
  repairId: string;
  note: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface RepairTimelineEvent {
  id: string;
  repairId: string;
  event: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface WorkloadReport {
  technicianId: string;
  technicianName: string;
  activeRepairs: number;
  completedThisMonth: number;
  averageCompletionTime: number;
  totalRevenue: number;
  overdueRepairs: number;
  workloadPercentage: number;
}

class RepairService {
  async getRepairs(
    page: number = 1,
    limit: number = 10,
    filters: RepairFilters = {}
  ): Promise<PaginatedResponse<Repair>> {
    try {
      const params = {
        page,
        limit,
        ...filters,
      };

      return await apiClient.get<PaginatedResponse<Repair>>(API_CONFIG.ENDPOINTS.REPAIRS, params);
    } catch (error) {
      console.error('Failed to fetch repairs:', error);
      throw error;
    }
  }

  async getRepairById(id: string): Promise<Repair> {
    try {
      return await apiClient.get<Repair>(`${API_CONFIG.ENDPOINTS.REPAIRS}/${id}`);
    } catch (error) {
      console.error(`Failed to fetch repair ${id}:`, error);
      throw error;
    }
  }

  async getActiveRepairs(): Promise<Repair[]> {
    try {
      return await apiClient.get<Repair[]>(API_CONFIG.ENDPOINTS.ACTIVE_REPAIRS);
    } catch (error) {
      console.error('Failed to fetch active repairs:', error);
      throw error;
    }
  }

  async getOverdueRepairs(): Promise<Repair[]> {
    try {
      return await apiClient.get<Repair[]>(API_CONFIG.ENDPOINTS.OVERDUE_REPAIRS);
    } catch (error) {
      console.error('Failed to fetch overdue repairs:', error);
      throw error;
    }
  }

  async createRepair(repairData: CreateRepairData): Promise<Repair> {
    try {
      return await apiClient.post<Repair>(API_CONFIG.ENDPOINTS.REPAIRS, repairData);
    } catch (error) {
      console.error('Failed to create repair:', error);
      throw error;
    }
  }

  async updateRepair(id: string, repairData: UpdateRepairData): Promise<Repair> {
    try {
      return await apiClient.patch<Repair>(`${API_CONFIG.ENDPOINTS.REPAIRS}/${id}`, repairData);
    } catch (error) {
      console.error(`Failed to update repair ${id}:`, error);
      throw error;
    }
  }

  async updateRepairStatus(
    id: string, 
    status: string, 
    notes?: string, 
    sendSMS: boolean = true
  ): Promise<Repair> {
    try {
      return await apiClient.post<Repair>(
        `${API_CONFIG.ENDPOINTS.REPAIRS}/${id}/status`,
        {
          status,
          notes: notes || `Status changed to ${status}`,
          sendSMS
        }
      );
    } catch (error) {
      console.error(`Failed to update repair status ${id}:`, error);
      throw error;
    }
  }

  async cancelRepair(id: string, reason: string): Promise<Repair> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.CANCEL_REPAIR, {
        id,
      });
      return await apiClient.post<Repair>(endpoint, { reason });
    } catch (error) {
      console.error(`Failed to cancel repair ${id}:`, error);
      throw error;
    }
  }

  async getRepairStats(): Promise<RepairStats> {
    try {
      return await apiClient.get<RepairStats>(API_CONFIG.ENDPOINTS.REPAIR_STATS);
    } catch (error) {
      console.error('Failed to fetch repair stats:', error);
      throw error;
    }
  }

  async getRepairNotes(repairId: string): Promise<RepairNote[]> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.REPAIR_NOTES, {
        id: repairId,
      });
      return await apiClient.get<RepairNote[]>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch notes for repair ${repairId}:`, error);
      throw error;
    }
  }

  async addRepairNote(repairId: string, note: string): Promise<RepairNote> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.REPAIR_NOTES, {
        id: repairId,
      });
      return await apiClient.post<RepairNote>(endpoint, { note });
    } catch (error) {
      console.error(`Failed to add note to repair ${repairId}:`, error);
      throw error;
    }
  }

  async getRepairTimeline(repairId: string): Promise<RepairTimelineEvent[]> {
    try {
      const endpoint = apiClient.replaceUrlParams(API_CONFIG.ENDPOINTS.REPAIR_TIMELINE, {
        id: repairId,
      });
      return await apiClient.get<RepairTimelineEvent[]>(endpoint);
    } catch (error) {
      console.error(`Failed to fetch timeline for repair ${repairId}:`, error);
      throw error;
    }
  }

  async getWorkloadReport(): Promise<WorkloadReport[]> {
    try {
      return await apiClient.get<WorkloadReport[]>(API_CONFIG.ENDPOINTS.WORKLOAD_REPORT);
    } catch (error) {
      console.error('Failed to fetch workload report:', error);
      throw error;
    }
  }

  async uploadRepairImages(repairId: string, files: File[]): Promise<{ imageUrls: string[] }> {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`images`, file);
      });

      return await apiClient.uploadFile<{ imageUrls: string[] }>(
        `${API_CONFIG.ENDPOINTS.REPAIRS}/${repairId}/images`,
        files[0], // Use first file as main file, others as additional data
        files.length > 1 ? { additionalFiles: files.slice(1) } : undefined
      );
    } catch (error) {
      console.error(`Failed to upload images for repair ${repairId}:`, error);
      throw error;
    }
  }

  async searchRepairs(query: string, limit: number = 20): Promise<Repair[]> {
    try {
      const response = await this.getRepairs(1, limit, { search: query });
      return response.data;
    } catch (error) {
      console.error('Failed to search repairs:', error);
      throw error;
    }
  }

  // Utility methods for repair management
  calculateCompletionTime(repair: Repair): number | null {
    if (!repair.dateCompleted) return null;
    
    const received = new Date(repair.dateReceived);
    const completed = new Date(repair.dateCompleted);
    
    return Math.ceil((completed.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
  }

  isOverdue(repair: Repair): boolean {
    if (!repair.estimatedCompletion || repair.status === 'COMPLETED' || repair.status === 'DELIVERED') {
      return false;
    }
    
    const now = new Date();
    const estimatedDate = new Date(repair.estimatedCompletion);
    
    return now > estimatedDate;
  }

  getDaysOverdue(repair: Repair): number {
    if (!this.isOverdue(repair)) return 0;
    
    const now = new Date();
    const estimatedDate = new Date(repair.estimatedCompletion!);
    
    return Math.ceil((now.getTime() - estimatedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'green';
      default: return 'gray';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'RECEIVED': return 'blue';
      case 'ASSESSED': return 'purple';
      case 'IN_PROGRESS': return 'orange';
      case 'COMPLETED': return 'green';
      case 'READY_FOR_PICKUP': return 'cyan';
      case 'DELIVERED': return 'gray';
      case 'CANCELLED': return 'red';
      default: return 'gray';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  validateRepairData(repairData: CreateRepairData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!repairData.customerId) {
      errors.push('Customer ID is required');
    }

    if (!repairData.itemDescription || repairData.itemDescription.trim().length === 0) {
      errors.push('Item description is required');
    }

    if (!repairData.problemDescription || repairData.problemDescription.trim().length === 0) {
      errors.push('Problem description is required');
    }

    if (!repairData.repairType || repairData.repairType.trim().length === 0) {
      errors.push('Repair type is required');
    }

    if (!repairData.estimatedCost || repairData.estimatedCost <= 0) {
      errors.push('Valid estimated cost is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const repairService = new RepairService();
export default repairService;