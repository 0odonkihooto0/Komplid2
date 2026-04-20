'use client';

import { WifiOff } from 'lucide-react';
import { useNetworkStore } from '@/stores/network-store';

export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 py-1.5 text-center text-sm text-amber-950">
      <WifiOff className="h-4 w-4" />
      <span>Нет подключения. Изменения сохранятся и синхронизируются позже.</span>
    </div>
  );
}
