import { apiClient } from './apiClient';

export interface PosTile {
  id: string;
  label: string;
  saleName: string;
  defaultPrice: number | null;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PosTileInput {
  label: string;
  saleName?: string;
  defaultPrice?: number | null;
  color?: string;
  icon?: string;
}

const BASE = '/pos-tiles';

export const posTileService = {
  /** Active tiles in display order (used by both POS and the Settings maker). */
  async list(): Promise<PosTile[]> {
    return apiClient.get<PosTile[]>(BASE);
  },

  async create(input: PosTileInput): Promise<PosTile> {
    return apiClient.post<PosTile>(BASE, input);
  },

  async update(id: string, input: Partial<PosTileInput> & { isActive?: boolean }): Promise<PosTile> {
    return apiClient.patch<PosTile>(`${BASE}/${id}`, input);
  },

  async remove(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE}/${id}`);
  },

  /** Persist a new display order after a drag-reorder. */
  async reorder(tiles: { id: string; sortOrder: number }[]): Promise<PosTile[]> {
    return apiClient.patch<PosTile[]>(`${BASE}/reorder`, { tiles });
  },
};
