import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ─────────────────────────────────────────────
// Типы данных в IDB
// ─────────────────────────────────────────────

export interface SyncQueueItem {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';

  entityType: 'journal_entry' | 'photo' | 'defect' | 'remark' | 'other';
  entityId?: string;
  description?: string;

  lastError?: string;
  lastTriedAt?: number;
}

export interface OfflineJournalEntry {
  clientId: string;
  serverId?: string;
  journalId: string;
  entryNumber?: string;
  date: string;
  description: string;
  data: Record<string, unknown>;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  updatedAt: number;
  attachmentClientIds: string[];
}

export interface OfflinePhoto {
  clientId: string;
  serverId?: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;

  entityType: string;
  entityClientId?: string;
  entityServerId?: string;

  gpsLat?: number;
  gpsLng?: number;
  takenAt: number;
  category?: 'CONFIRMING' | 'VIOLATION';

  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed';
  uploadProgress: number;
  createdAt: number;
}

export interface CacheSnapshot {
  key: string;
  data: unknown;
  cachedAt: number;
  ttl: number;
}

// ─────────────────────────────────────────────
// Схема БД
// ─────────────────────────────────────────────

interface StroyDocsDB extends DBSchema {
  'sync-queue': {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-timestamp': number;
      'by-entity': string;
    };
  };
  'offline-journal-entries': {
    key: string;
    value: OfflineJournalEntry;
    indexes: {
      'by-journal': string;
      'by-sync-status': string;
    };
  };
  'offline-photos': {
    key: string;
    value: OfflinePhoto;
    indexes: {
      'by-entity': string;
      'by-sync-status': string;
    };
  };
  'cache-snapshots': {
    key: string;
    value: CacheSnapshot;
    indexes: {
      'by-cached-at': number;
    };
  };
}

const DB_NAME = 'stroydocs-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StroyDocsDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<StroyDocsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StroyDocsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sync-queue')) {
          const queueStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-timestamp', 'timestamp');
          queueStore.createIndex('by-entity', 'entityType');
        }

        if (!db.objectStoreNames.contains('offline-journal-entries')) {
          const journalStore = db.createObjectStore('offline-journal-entries', {
            keyPath: 'clientId',
          });
          journalStore.createIndex('by-journal', 'journalId');
          journalStore.createIndex('by-sync-status', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('offline-photos')) {
          const photoStore = db.createObjectStore('offline-photos', {
            keyPath: 'clientId',
          });
          photoStore.createIndex('by-entity', 'entityClientId');
          photoStore.createIndex('by-sync-status', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('cache-snapshots')) {
          const cacheStore = db.createObjectStore('cache-snapshots', {
            keyPath: 'key',
          });
          cacheStore.createIndex('by-cached-at', 'cachedAt');
        }
      },
      blocked() {
        console.warn('IndexedDB upgrade blocked — пользователь должен закрыть другие вкладки');
      },
      blocking() {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
    });
  }
  return dbPromise;
}
