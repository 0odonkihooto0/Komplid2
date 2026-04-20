import { syncQueueRepo } from './repos/sync-queue-repo';
import { photosRepo } from './repos/photos-repo';
import { journalEntriesRepo } from './repos/journal-entries-repo';
import type { SyncQueueItem } from './db';

const MAX_RETRY_COUNT = 5;
const RETRY_BACKOFF_MS = [1000, 5000, 15000, 60000, 300000];

type SyncEvent =
  | { type: 'started'; total: number }
  | { type: 'progress'; completed: number; total: number }
  | { type: 'item-success'; id: string }
  | { type: 'item-failed'; id: string; error: string }
  | { type: 'finished'; successful: number; failed: number };

type Listener = (event: SyncEvent) => void;

class SyncManager {
  private listeners: Set<Listener> = new Set();
  private isRunning = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent) {
    for (const l of Array.from(this.listeners)) l(event);
  }

  async sync(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.uploadPendingPhotos();
      await this.processApiQueue();
    } finally {
      this.isRunning = false;
    }
  }

  private async processApiQueue(): Promise<void> {
    const pending = await syncQueueRepo.listPending();
    if (pending.length === 0) return;

    this.emit({ type: 'started', total: pending.length });

    let successful = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];

      if (item.retryCount >= MAX_RETRY_COUNT) {
        await syncQueueRepo.markFailed(item.id, 'Max retry count reached');
        failed++;
        continue;
      }

      await syncQueueRepo.markSyncing(item.id);

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');

          if (response.status >= 400 && response.status < 500) {
            if (![401, 408, 429].includes(response.status)) {
              await syncQueueRepo.markFailed(
                item.id,
                `${response.status}: ${errorText.slice(0, 200)}`
              );
              failed++;
              this.emit({ type: 'item-failed', id: item.id, error: errorText });
              continue;
            }
          }

          throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
        }

        await syncQueueRepo.markCompleted(item.id);
        successful++;
        this.emit({ type: 'item-success', id: item.id });

        await this.postProcessSuccess(item, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await syncQueueRepo.markFailed(item.id, message);
        failed++;
        this.emit({ type: 'item-failed', id: item.id, error: message });

        const backoff = RETRY_BACKOFF_MS[Math.min(item.retryCount, RETRY_BACKOFF_MS.length - 1)];
        await sleep(Math.min(backoff, 5000));
      }

      this.emit({ type: 'progress', completed: i + 1, total: pending.length });
    }

    this.emit({ type: 'finished', successful, failed });
  }

  private async uploadPendingPhotos(): Promise<void> {
    const pending = await photosRepo.listPendingUpload();

    for (const photo of pending) {
      try {
        await photosRepo.markUploading(photo.clientId);

        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            size: photo.size,
            entityType: photo.entityType,
            entityId: photo.entityServerId ?? photo.entityClientId,
            gpsLat: photo.gpsLat,
            gpsLng: photo.gpsLng,
            takenAt: new Date(photo.takenAt).toISOString(),
            category: photo.category,
          }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`API photo create failed: ${res.status}`);
        const { data } = (await res.json()) as { data: { photo: { id: string }; uploadUrl: string } };
        const { photo: serverPhoto, uploadUrl } = data;

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: photo.blob,
          headers: { 'Content-Type': photo.mimeType },
        });
        if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

        await photosRepo.markSynced(photo.clientId, serverPhoto.id);
      } catch {
        await photosRepo.markFailed(photo.clientId);
      }
    }
  }

  private async postProcessSuccess(item: SyncQueueItem, response: Response): Promise<void> {
    if (item.entityType === 'journal_entry' && item.method === 'POST') {
      try {
        const body = (await response.clone().json()) as { data?: { id?: string } };
        const serverId = body?.data?.id;
        if (item.entityId && serverId) {
          await journalEntriesRepo.markSynced(item.entityId, serverId);
        }
      } catch {
        // запись уже создана на сервере — игнорируем
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const syncManager = new SyncManager();
