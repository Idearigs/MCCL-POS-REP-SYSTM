import { apiClient } from './apiClient';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string[];
  createdBy: string;
  dueDate?: string;
  startDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  comments?: TaskComment[];
  activities?: TaskActivity[];
  _count?: {
    comments: number;
    activities: number;
  };
}

export interface TaskComment {
  id: string;
  comment: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface TaskActivity {
  id: string;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo: string[];
  dueDate?: string;
  startDate?: string;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string[];
  dueDate?: string;
  startDate?: string;
  tags?: string[];
}

export const taskService = {
  // Get all tasks
  getAll: async (filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToMe?: boolean;
    createdByMe?: boolean;
  }): Promise<Task[]> => {
    return await apiClient.get('/tasks', { params: filters });
  },

  // Get my tasks
  getMyTasks: async (): Promise<Task[]> => {
    return await apiClient.get('/tasks/my-tasks');
  },

  // Get task stats
  getStats: async (): Promise<TaskStats> => {
    return await apiClient.get('/tasks/stats');
  },

  // Get single task
  getById: async (id: string): Promise<Task> => {
    return await apiClient.get(`/tasks/${id}`);
  },

  // Create task
  create: async (data: CreateTaskDto): Promise<Task> => {
    return await apiClient.post('/tasks', data);
  },

  // Update task
  update: async (id: string, data: UpdateTaskDto): Promise<Task> => {
    return await apiClient.put(`/tasks/${id}`, data);
  },

  // Delete task
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },

  // Add comment
  addComment: async (id: string, comment: string): Promise<TaskComment> => {
    return await apiClient.post(`/tasks/${id}/comments`, { comment });
  },
};
