import { getDB, type OfflinePhoto } from '../db';

export const photosRepo = {
  async create(photo: OfflinePhoto): Promise<void> {
    const db = await getDB();
    await db.add('offline-photos', photo);
  },

  async get(clientId: string): Promise<OfflinePhoto | undefined> {
    const db = await getDB();
    return db.get('offline-photos', clientId);
  },

  async getAll(): Promise<OfflinePhoto[]> {
    const db = await getDB();
    return db.getAll('offline-photos');
  },

  async listPendingUpload(): Promise<OfflinePhoto[]> {
    const db = await getDB();
    return db.getAllFromIndex('offline-photos', 'by-sync-status', 'pending');
  },

  async markUploading(clientId: string): Promise<void> {
    const db = await getDB();
    const photo = await db.get('offline-photos', clientId);
    if (!photo) return;
    photo.syncStatus = 'uploading';
    photo.uploadProgress = 0;
    await db.put('offline-photos', photo);
  },

  async updateProgress(clientId: string, progress: number): Promise<void> {
    const db = await getDB();
    const photo = await db.get('offline-photos', clientId);
    if (!photo) return;
    photo.uploadProgress = Math.min(100, Math.max(0, progress));
    await db.put('offline-photos', photo);
  },

  async markSynced(clientId: string, serverId: string): Promise<void> {
    const db = await getDB();
    const photo = await db.get('offline-photos', clientId);
    if (!photo) return;
    photo.serverId = serverId;
    photo.syncStatus = 'synced';
    photo.uploadProgress = 100;
    await db.put('offline-photos', photo);
  },

  async markFailed(clientId: string): Promise<void> {
    const db = await getDB();
    const photo = await db.get('offline-photos', clientId);
    if (!photo) return;
    photo.syncStatus = 'failed';
    await db.put('offline-photos', photo);
  },

  async delete(clientId: string): Promise<void> {
    const db = await getDB();
    await db.delete('offline-photos', clientId);
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('offline-photos');
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('offline-photos');
  },
};
