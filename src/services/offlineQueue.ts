// Offline queue — stores sales locally in IndexedDB when server is unreachable.
// Does NOT interfere with the normal online path.

export interface QueuedSale {
  clientSaleId: string;   // UUID generated on client, used for idempotency on sync
  tenantId: string;
  saleData: unknown;      // CreateSaleData payload, verbatim
  queuedAt: number;       // Date.now()
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  lastError?: string;
  serverId?: string;      // Populated after successful sync
}

const DB_NAME = 'mps_offline';
const STORE   = 'pending_sales';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'clientSaleId' });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function enqueue(sale: Omit<QueuedSale, 'status' | 'attempts'>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const req = tx(db, 'readwrite').put({ ...sale, status: 'pending', attempts: 0 });
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
  db.close();
}

export async function getPending(): Promise<QueuedSale[]> {
  const db = await openDb();
  const results = await new Promise<QueuedSale[]>((res, rej) => {
    const req = tx(db, 'readonly').index('status').getAll('pending');
    req.onsuccess = () => res(req.result as QueuedSale[]);
    req.onerror   = () => rej(req.error);
  });
  db.close();
  return results;
}

export async function updateEntry(clientSaleId: string, patch: Partial<QueuedSale>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const store = tx(db, 'readwrite');
    const get = store.get(clientSaleId);
    get.onsuccess = () => {
      if (!get.result) { res(); return; }
      const put = store.put({ ...get.result, ...patch });
      put.onsuccess = () => res();
      put.onerror   = () => rej(put.error);
    };
    get.onerror = () => rej(get.error);
  });
  db.close();
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  const count = await new Promise<number>((res, rej) => {
    const req = tx(db, 'readonly').index('status').count('pending');
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
  db.close();
  return count;
}
