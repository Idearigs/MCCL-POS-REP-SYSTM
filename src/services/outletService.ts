import { apiClient } from './apiClient';

export interface Outlet {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isPrimary: boolean;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
}

export interface SelectedOutlet {
  id: string;
  name: string;
  code: string;
  isPrimary: boolean;
}

export interface OutletBilling {
  count: number;
  included: number;
  extra: number;
  monthlyExtra: number;
  summary: string;
}

const STORAGE_KEY = 'mps_selected_outlet';

class OutletService {
  async getOutlets(): Promise<Outlet[]> {
    return apiClient.get<Outlet[]>('/outlets');
  }

  async createOutlet(data: {
    name: string;
    code: string;
    password: string;
    address?: string;
    phone?: string;
  }): Promise<Outlet> {
    return apiClient.post<Outlet>('/outlets', data);
  }

  async updateOutlet(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      password: string;
      isActive: boolean;
      address: string;
      phone: string;
    }>,
  ): Promise<Outlet> {
    return apiClient.patch<Outlet>(`/outlets/${id}`, data);
  }

  async deleteOutlet(id: string): Promise<void> {
    return apiClient.delete(`/outlets/${id}`);
  }

  async verifyPassword(
    id: string,
    password: string,
  ): Promise<SelectedOutlet> {
    return apiClient.post<SelectedOutlet>(`/outlets/${id}/verify`, {
      password,
    });
  }

  async getBilling(): Promise<OutletBilling> {
    return apiClient.get<OutletBilling>('/outlets/count');
  }

  // ── Local selection state ──────────────────────────────────────────────────

  getStoredOutlet(): SelectedOutlet | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SelectedOutlet) : null;
    } catch {
      return null;
    }
  }

  storeOutlet(outlet: SelectedOutlet): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outlet));
  }

  clearOutlet(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const outletService = new OutletService();
