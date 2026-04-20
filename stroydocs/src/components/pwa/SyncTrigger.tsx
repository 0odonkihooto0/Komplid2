'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network-store';
import { syncManager } from '@/lib/idb/sync-manager';

export function SyncTrigger() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => syncManager.sync(), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  useEffect(() => {
    if (navigator.onLine) {
      syncManager.sync();
    }
  }, []);

  return null;
}
