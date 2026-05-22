// Drains the offline queue when connection is restored.
// Runs in the background — no user interaction required.

import { connectionMonitor } from './connectionMonitor';
import { getPending, updateEntry, getPendingCount } from './offlineQueue';
import { API_CONFIG } from '../config/api';
import { apiClient } from './apiClient';

type SyncListener = (pendingCount: number) => void;

class OfflineSyncService {
  private _listeners: Set<SyncListener> = new Set();
  private _syncing = false;

  start() {
    connectionMonitor.start();
    connectionMonitor.subscribe((online) => {
      if (online) this._sync();
    });
    // On startup, attempt sync in case items were queued in a previous session
    connectionMonitor['_check']?.();
    setTimeout(() => this._sync(), 3000);
  }

  subscribe(fn: SyncListener) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  async getPendingCount() {
    return getPendingCount();
  }

  private async _sync() {
    if (this._syncing || !connectionMonitor.isOnline) return;
    this._syncing = true;

    try {
      const pending = await getPending();
      if (!pending.length) return;

      for (const sale of pending) {
        await updateEntry(sale.clientSaleId, { status: 'syncing' });
        try {
          const payload = {
            ...(sale.saleData as object),
            clientSaleId: sale.clientSaleId,
          };
          const result = await apiClient.post(
            API_CONFIG.ENDPOINTS.CREATE_SALE,
            payload,
          ) as { id: string };

          await updateEntry(sale.clientSaleId, {
            status: 'synced',
            serverId: result.id,
          });
        } catch (err: unknown) {
          const httpStatus = (err as { status?: number })?.status;
          if (httpStatus === 409) {
            // Already exists on server (duplicate) — mark synced
            await updateEntry(sale.clientSaleId, { status: 'synced' });
          } else {
            await updateEntry(sale.clientSaleId, {
              status: 'pending',
              attempts: sale.attempts + 1,
              lastError: String(err),
            });
          }
        }
      }
    } finally {
      this._syncing = false;
      const remaining = await getPendingCount();
      this._listeners.forEach(fn => fn(remaining));
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
