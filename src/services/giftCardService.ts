import { apiClient } from './apiClient';

export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  recipientName?: string;
  recipientEmail?: string;
  purchasedBy?: string;
  expiresAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  transactions: GiftCardTransaction[];
}

export interface GiftCardTransaction {
  id: string;
  amount: number;
  type: 'ISSUED' | 'REDEMPTION' | 'CANCELLED' | string;
  reference?: string;
  performedBy: string;
  createdAt: string;
}

export interface CreateGiftCardData {
  initialBalance: number;
  recipientName?: string;
  recipientEmail?: string;
  purchasedBy?: string;
  expiresAt?: string;
  notes?: string;
}

export interface ValidateResult {
  valid: boolean;
  reason?: string;
  balance?: number;
  code?: string;
  id?: string;
  recipientName?: string;
}

export interface RedeemResult {
  success: boolean;
  amountRedeemed: number;
  remainingBalance: number;
  card: GiftCard;
}

class GiftCardService {
  async create(data: CreateGiftCardData): Promise<GiftCard> {
    return apiClient.post<GiftCard>('/gift-cards', data);
  }

  async getAll(status?: string): Promise<GiftCard[]> {
    const params = status ? { status } : {};
    return apiClient.get<GiftCard[]>('/gift-cards', params);
  }

  async getById(id: string): Promise<GiftCard> {
    return apiClient.get<GiftCard>(`/gift-cards/${id}`);
  }

  async getByCode(code: string): Promise<GiftCard> {
    return apiClient.get<GiftCard>(`/gift-cards/code/${code}`);
  }

  async validate(code: string): Promise<ValidateResult> {
    return apiClient.post<ValidateResult>('/gift-cards/validate', { code });
  }

  async redeem(code: string, amount: number, reference?: string): Promise<RedeemResult> {
    return apiClient.post<RedeemResult>('/gift-cards/redeem', { code, amount, reference });
  }

  async cancel(id: string): Promise<GiftCard> {
    return apiClient.delete<GiftCard>(`/gift-cards/${id}`);
  }
}

export const giftCardService = new GiftCardService();
