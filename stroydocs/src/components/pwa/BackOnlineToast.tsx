'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network-store';
import { toast } from '@/hooks/useToast';

export function BackOnlineToast() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const wasOffline = useNetworkStore((s) => s.wasOffline);

  useEffect(() => {
    if (isOnline && wasOffline) {
      toast({ title: 'Соединение восстановлено', description: 'Синхронизация данных...' });
    }
  }, [isOnline, wasOffline]);

  return null;
}
