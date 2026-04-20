import { getDB, type CacheSnapshot } from '../db';

export const cacheSnapshotsRepo = {
  async get(key: string): Promise<CacheSnapshot | undefined> {
    const db = await getDB();
    return db.get('cache-snapshots', key);
  },

  async set(key: string, data: unknown, ttl: number): Promise<void> {
    const db = await getDB();
    const snapshot: CacheSnapshot = { key, data, cachedAt: Date.now(), ttl };
    await db.put('cache-snapshots', snapshot);
  },

  isStale(snapshot: CacheSnapshot): boolean {
    return Date.now() - snapshot.cachedAt > snapshot.ttl;
  },

  async getFresh(key: string): Promise<CacheSnapshot | undefined> {
    const snapshot = await cacheSnapshotsRepo.get(key);
    if (!snapshot) return undefined;
    if (cacheSnapshotsRepo.isStale(snapshot)) return undefined;
    return snapshot;
  },

  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.delete('cache-snapshots', key);
  },

  async purgeStale(): Promise<number> {
    const db = await getDB();
    const all = await db.getAll('cache-snapshots');
    const now = Date.now();
    let count = 0;
    for (const snapshot of all) {
      if (now - snapshot.cachedAt > snapshot.ttl) {
        await db.delete('cache-snapshots', snapshot.key);
        count++;
      }
    }
    return count;
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('cache-snapshots');
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('cache-snapshots');
  },
};
