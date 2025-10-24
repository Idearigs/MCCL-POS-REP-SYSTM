export enum StockTakeStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum StockTakeItemStatus {
  VERIFIED = 'VERIFIED',
  MISSING = 'MISSING',
  UNEXPECTED = 'UNEXPECTED',
  DAMAGED = 'DAMAGED',
}

export interface StockTakeSession {
  id: string;
  tenantId: string;
  sessionName: string;
  location?: string;
  remarks?: string;
  status: StockTakeStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  stock_take_items?: StockTakeItem[];
  _count?: {
    stock_take_items: number;
  };
  summary?: {
    totalScanned: number;
    verified: number;
    missing: number;
    unexpected: number;
    damaged: number;
    totalVariance: number;
    accuracy: string;
  };
}

export interface StockTakeItem {
  id: string;
  sessionId: string;
  productId?: string;
  scannedCode: string;
  productName?: string;
  productSku?: string;
  expectedQuantity?: number;
  scannedQuantity: number;
  systemQuantity?: number;
  variance?: number;
  status: StockTakeItemStatus;
  notes?: string;
  scannedBy: string;
  scannedAt: string;
  createdAt: string;
  scanner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateSessionDto {
  sessionName: string;
  location?: string;
  remarks?: string;
}

export interface ScanItemDto {
  scannedCode: string;
  scannedQuantity?: number;
  notes?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
}

export interface UpdateSessionDto {
  sessionName?: string;
  location?: string;
  remarks?: string;
  status?: StockTakeStatus;
}

export interface ApproveSessionDto {
  approve: boolean;
  rejectionReason?: string;
  applyToInventory?: boolean;
}

export interface ScanResult {
  item: StockTakeItem;
  product?: any;
  isDuplicate: boolean;
  warning?: string;
}
