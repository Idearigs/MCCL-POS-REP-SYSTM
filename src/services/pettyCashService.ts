import { apiClient } from './apiClient';

export enum PettyCashStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum PettyCashCategory {
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  TRANSPORT = 'TRANSPORT',
  MEALS = 'MEALS',
  UTILITIES = 'UTILITIES',
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  REFRESHMENTS = 'REFRESHMENTS',
  POSTAGE = 'POSTAGE',
  BANKING_FEES = 'BANKING_FEES',
  MISCELLANEOUS = 'MISCELLANEOUS',
  OTHER = 'OTHER',
}

export interface PettyCashAccount {
  id: string;
  tenantId: string;
  accountName: string;
  accountNumber: string;
  registerName?: string;
  location?: string;
  openingBalance: number;
  currentBalance: number;
  monthlyBudget?: number;
  isActive: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  transactions?: PettyCashTransaction[];
}

export interface PettyCashTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  transactionNumber: string;
  category: PettyCashCategory;
  amount: number;
  description: string;
  vendor?: string;
  receiptNumber?: string;
  receiptImage?: string;
  status: PettyCashStatus;
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  notes?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  account?: {
    id: string;
    accountName: string;
    accountNumber: string;
    currentBalance?: number;
  };
}

export interface CreatePettyCashAccountDto {
  accountName: string;
  registerName?: string;
  location?: string;
  openingBalance: number;
  monthlyBudget?: number;
  notes?: string;
}

export interface UpdatePettyCashAccountDto {
  accountName?: string;
  registerName?: string;
  location?: string;
  monthlyBudget?: number;
  isActive?: boolean;
  notes?: string;
}

export interface ReplenishPettyCashDto {
  amount: number;
  reason: string;
  reference?: string;
}

export interface CreatePettyCashTransactionDto {
  accountId: string;
  category: PettyCashCategory;
  amount: number;
  description: string;
  vendor?: string;
  receiptNumber?: string;
  receiptImage?: string;
  notes?: string;
  transactionDate?: string;
}

export interface UpdatePettyCashTransactionDto {
  amount?: number;
  description?: string;
  vendor?: string;
  receiptNumber?: string;
  notes?: string;
  category?: PettyCashCategory;
}

export interface ApprovePettyCashTransactionDto {
  notes?: string;
}

export interface RejectPettyCashTransactionDto {
  rejectionReason: string;
}

export interface GetPettyCashTransactionsParams {
  page?: number;
  limit?: number;
  accountId?: string;
  status?: PettyCashStatus;
  category?: PettyCashCategory;
  startDate?: string;
  endDate?: string;
}

export interface PettyCashTransactionsResponse {
  data: PettyCashTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PettyCashSummaryReport {
  totalExpenses: number;
  pendingAmount: number;
  transactionCount: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

class PettyCashService {
  private baseUrl = '/petty-cash';

  // ===== ACCOUNTS =====

  async createAccount(data: CreatePettyCashAccountDto): Promise<PettyCashAccount> {
    return apiClient.post(`${this.baseUrl}/accounts`, data);
  }

  async getAccounts(): Promise<PettyCashAccount[]> {
    return apiClient.get(`${this.baseUrl}/accounts`);
  }

  async getAccountById(accountId: string): Promise<PettyCashAccount> {
    return apiClient.get(`${this.baseUrl}/accounts/${accountId}`);
  }

  async updateAccount(
    accountId: string,
    data: UpdatePettyCashAccountDto
  ): Promise<PettyCashAccount> {
    return apiClient.put(`${this.baseUrl}/accounts/${accountId}`, data);
  }

  async replenishAccount(
    accountId: string,
    data: ReplenishPettyCashDto
  ): Promise<PettyCashAccount> {
    return apiClient.post(
      `${this.baseUrl}/accounts/${accountId}/replenish`,
      data
    );
  }

  async deleteAccount(accountId: string): Promise<void> {
    return apiClient.delete(`${this.baseUrl}/accounts/${accountId}`);
  }

  // ===== TRANSACTIONS =====

  async createTransaction(
    data: CreatePettyCashTransactionDto
  ): Promise<PettyCashTransaction> {
    return apiClient.post(`${this.baseUrl}/transactions`, data);
  }

  async getTransactions(
    params?: GetPettyCashTransactionsParams
  ): Promise<PettyCashTransactionsResponse> {
    return apiClient.get(`${this.baseUrl}/transactions`, params);
  }

  async getTransactionById(transactionId: string): Promise<PettyCashTransaction> {
    return apiClient.get(`${this.baseUrl}/transactions/${transactionId}`);
  }

  async updateTransaction(
    transactionId: string,
    data: UpdatePettyCashTransactionDto
  ): Promise<PettyCashTransaction> {
    return apiClient.patch(`${this.baseUrl}/transactions/${transactionId}`, data);
  }

  async approveTransaction(
    transactionId: string,
    data?: ApprovePettyCashTransactionDto
  ): Promise<PettyCashTransaction> {
    return apiClient.post(
      `${this.baseUrl}/transactions/${transactionId}/approve`,
      data || {}
    );
  }

  async rejectTransaction(
    transactionId: string,
    data: RejectPettyCashTransactionDto
  ): Promise<PettyCashTransaction> {
    return apiClient.post(
      `${this.baseUrl}/transactions/${transactionId}/reject`,
      data
    );
  }

  async cancelTransaction(transactionId: string): Promise<PettyCashTransaction> {
    return apiClient.post(
      `${this.baseUrl}/transactions/${transactionId}/cancel`
    );
  }

  // ===== REPORTS =====

  async getSummaryReport(
    accountId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PettyCashSummaryReport> {
    const params: any = {};
    if (accountId) params.accountId = accountId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return apiClient.get(`${this.baseUrl}/reports/summary`, params);
  }

  // ===== HELPERS =====

  getCategoryLabel(category: PettyCashCategory): string {
    const labels: Record<PettyCashCategory, string> = {
      [PettyCashCategory.OFFICE_SUPPLIES]: 'Office Supplies',
      [PettyCashCategory.TRANSPORT]: 'Transport',
      [PettyCashCategory.MEALS]: 'Meals',
      [PettyCashCategory.UTILITIES]: 'Utilities',
      [PettyCashCategory.MAINTENANCE]: 'Maintenance',
      [PettyCashCategory.CLEANING]: 'Cleaning',
      [PettyCashCategory.REFRESHMENTS]: 'Refreshments',
      [PettyCashCategory.POSTAGE]: 'Postage',
      [PettyCashCategory.BANKING_FEES]: 'Banking Fees',
      [PettyCashCategory.MISCELLANEOUS]: 'Miscellaneous',
      [PettyCashCategory.OTHER]: 'Other',
    };
    return labels[category];
  }

  getStatusLabel(status: PettyCashStatus): string {
    const labels: Record<PettyCashStatus, string> = {
      [PettyCashStatus.PENDING]: 'Pending',
      [PettyCashStatus.APPROVED]: 'Approved',
      [PettyCashStatus.REJECTED]: 'Rejected',
      [PettyCashStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status];
  }
}

export const pettyCashService = new PettyCashService();
export default pettyCashService;
