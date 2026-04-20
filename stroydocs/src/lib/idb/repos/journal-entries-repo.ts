import { getDB, type OfflineJournalEntry } from '../db';

export const journalEntriesRepo = {
  async create(entry: OfflineJournalEntry): Promise<void> {
    const db = await getDB();
    await db.add('offline-journal-entries', entry);
  },

  async get(clientId: string): Promise<OfflineJournalEntry | undefined> {
    const db = await getDB();
    return db.get('offline-journal-entries', clientId);
  },

  async getAll(): Promise<OfflineJournalEntry[]> {
    const db = await getDB();
    return db.getAll('offline-journal-entries');
  },

  async getByJournal(journalId: string): Promise<OfflineJournalEntry[]> {
    const db = await getDB();
    return db.getAllFromIndex('offline-journal-entries', 'by-journal', journalId);
  },

  async getPending(): Promise<OfflineJournalEntry[]> {
    const db = await getDB();
    return db.getAllFromIndex('offline-journal-entries', 'by-sync-status', 'pending');
  },

  async update(entry: OfflineJournalEntry): Promise<void> {
    const db = await getDB();
    await db.put('offline-journal-entries', { ...entry, updatedAt: Date.now() });
  },

  async markSynced(clientId: string, serverId: string): Promise<void> {
    const db = await getDB();
    const entry = await db.get('offline-journal-entries', clientId);
    if (!entry) return;
    entry.serverId = serverId;
    entry.syncStatus = 'synced';
    entry.updatedAt = Date.now();
    await db.put('offline-journal-entries', entry);
  },

  async markFailed(clientId: string): Promise<void> {
    const db = await getDB();
    const entry = await db.get('offline-journal-entries', clientId);
    if (!entry) return;
    entry.syncStatus = 'failed';
    entry.updatedAt = Date.now();
    await db.put('offline-journal-entries', entry);
  },

  async delete(clientId: string): Promise<void> {
    const db = await getDB();
    await db.delete('offline-journal-entries', clientId);
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('offline-journal-entries');
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('offline-journal-entries');
  },
};
