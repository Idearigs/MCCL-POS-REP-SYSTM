import { apiClient } from './apiClient';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto,
  UsersListResponse,
  UserRole,
} from '../types/user';

export const userService = {
  // Get all users with optional filters
  getUsers: async (
    role?: UserRole,
    isActive?: boolean,
    page?: number,
    limit?: number
  ): Promise<UsersListResponse> => {
    const params: any = {};
    if (role) params.role = role;
    if (isActive !== undefined) params.isActive = isActive;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    return await apiClient.get('/auth/users', params);
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    return await apiClient.get(`/auth/users/${userId}`);
  },

  // Create new user (via register endpoint)
  createUser: async (data: CreateUserDto): Promise<any> => {
    return await apiClient.post('/auth/register', data);
  },

  // Update user
  updateUser: async (userId: string, data: UpdateUserDto): Promise<User> => {
    return await apiClient.patch(`/auth/users/${userId}`, data);
  },

  // Reset user password (admin only)
  resetPassword: async (userId: string, password: string): Promise<void> => {
    await apiClient.patch(`/auth/users/${userId}/password`, { password });
  },

  // Deactivate user (set isActive to false)
  deactivateUser: async (userId: string): Promise<User> => {
    return await apiClient.patch(`/auth/users/${userId}`, { isActive: false });
  },

  // Activate user (set isActive to true)
  activateUser: async (userId: string): Promise<User> => {
    return await apiClient.patch(`/auth/users/${userId}`, { isActive: true });
  },
};
