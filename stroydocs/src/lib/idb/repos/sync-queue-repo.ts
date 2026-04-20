import { getDB, type SyncQueueItem } from '../db';

export const syncQueueRepo = {
  async enqueue(params: {
    url: string;
    method: SyncQueueItem['method'];
    body?: unknown;
    headers?: Record<string, string>;
    entityType: SyncQueueItem['entityType'];
    entityId?: string;
    description?: string;
  }): Promise<SyncQueueItem> {
    const db = await getDB();
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      url: params.url,
      method: params.method,
      headers: {
        'Content-Type': 'application/json',
        ...params.headers,
      },
      body: params.body ? JSON.stringify(params.body) : null,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
    };
    await db.add('sync-queue', item);
    return item;
  },

  async listPending(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAllFromIndex('sync-queue', 'by-status', 'pending');
  },

  async listAll(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAll('sync-queue');
  },

  async markSyncing(id: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('sync-queue', id);
    if (!item) return;
    item.status = 'syncing';
    item.lastTriedAt = Date.now();
    await db.put('sync-queue', item);
  },

  async markCompleted(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('sync-queue', id);
  },

  async markFailed(id: string, error: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('sync-queue', id);
    if (!item) return;
    item.status = 'failed';
    item.retryCount += 1;
    item.lastError = error;
    item.lastTriedAt = Date.now();
    await db.put('sync-queue', item);
  },

  async resetFailed(): Promise<void> {
    const db = await getDB();
    const failed = await db.getAllFromIndex('sync-queue', 'by-status', 'failed');
    const tx = db.transaction('sync-queue', 'readwrite');
    for (const item of failed) {
      item.status = 'pending';
      await tx.store.put(item);
    }
    await tx.done;
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('sync-queue');
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('sync-queue');
  },
};
