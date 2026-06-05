export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  READONLY = 'READONLY',
}

export interface UserPermissions {
  dashboard?: boolean;
  pos?: boolean;
  sales?: boolean;
  floatManagement?: boolean;
  pettyCash?: boolean;
  cashiers?: boolean;
  repairs?: boolean;
  customers?: boolean;
  inventory?: boolean;
  stockTaking?: boolean;
  calendar?: boolean;
  history?: boolean;
  search?: boolean;
  settings?: boolean;
  userManagement?: boolean;
  subscription?: boolean;
  mainframe?: boolean;
  financial_intelligence?: boolean;
  hrms?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  permissions?: UserPermissions;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  /** True when this user holds a cash-up override PIN (the hash is never sent to the client). */
  hasCashUpPin?: boolean;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ResetPasswordDto {
  password: string;
}

export interface UsersListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}
