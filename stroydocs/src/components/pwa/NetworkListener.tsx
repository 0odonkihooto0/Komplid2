'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network-store';

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

export function NetworkListener() {
  const setOnline = useNetworkStore((s) => s.setOnline);

  // Браузерные события online/offline
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Heartbeat-пинг каждые 30 сек — уточняет статус при «мёртвом» Wi-Fi
  useEffect(() => {
    const ping = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
      try {
        await fetch('/api/ping', { signal: controller.signal });
        setOnline(true);
      } catch {
        setOnline(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const intervalId = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [setOnline]);

  return null;
}
