import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
  ExpirationPlugin,
  CacheableResponsePlugin,
  BackgroundSyncPlugin,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const API_BG_SYNC_PLUGIN = new BackgroundSyncPlugin('stroydocs-api-queue', {
  maxRetentionTime: 24 * 60,
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: [
    // Аутентификация — никогда не кэшировать
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/auth/'),
      handler: new NetworkOnly(),
    },

    // Webhook и cron-роуты — NetworkOnly
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/webhooks/') ||
        url.pathname.startsWith('/api/cron/'),
      handler: new NetworkOnly(),
    },

    // GET API — NetworkFirst с 3-сек таймаутом, кэш 1 час
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith('/api/') && request.method === 'GET',
      handler: new NetworkFirst({
        cacheName: 'stroydocs-api-get',
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60,
          }),
        ],
      }),
    },

    // Мутации — NetworkOnly + BackgroundSync (24 ч очередь при offline)
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith('/api/') &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
      handler: new NetworkOnly({
        plugins: [API_BG_SYNC_PLUGIN],
      }),
    },

    // S3 pre-signed URLs (картинки, PDF) — StaleWhileRevalidate 7 дней
    {
      matcher: ({ url }) =>
        url.hostname.includes('timeweb') || url.hostname.includes('s3'),
      handler: new StaleWhileRevalidate({
        cacheName: 'stroydocs-s3-assets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },

    // Шрифты — CacheFirst 30 дней
    {
      matcher: ({ request }) => request.destination === 'font',
      handler: new CacheFirst({
        cacheName: 'stroydocs-fonts',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },

    // Next.js images — StaleWhileRevalidate 7 дней
    {
      matcher: ({ url }) => url.pathname.startsWith('/_next/image'),
      handler: new StaleWhileRevalidate({
        cacheName: 'stroydocs-next-images',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },

    ...defaultCache,
  ],

  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

// ─── Фаза 4: Push-уведомления ────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

self.addEventListener('push', (event) => {
  if (!(event instanceof PushEvent) || !event.data) return;

  interface PushData {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    urgent?: boolean;
    actions?: { action: string; title: string; icon?: string }[];
    data?: Record<string, unknown>;
  }

  let payload: PushData = {};

  try {
    payload = event.data.json() as PushData;
  } catch {
    payload = { title: 'StroyDocs', body: event.data.text() };
  }

  // Используем extended options с явным приведением типа для свойств
  // renotify/vibrate, которые не всегда присутствуют в старых lib typings
  const options = {
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: payload.badge ?? '/icons/badge-72.png',
    tag: payload.tag,
    renotify: !!payload.tag,
    requireInteraction: payload.urgent === true,
    data: { url: payload.url, ...payload.data },
    actions: payload.actions,
    vibrate: [200, 100, 200],
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'StroyDocs', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  if (!(event instanceof NotificationEvent)) return;
  event.notification.close();

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          if ('focus' in client) await (client as WindowClient).focus();
          if ('navigate' in client) {
            await (client as WindowClient).navigate(targetUrl).catch(() => {});
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  const pushEvent = event as PushSubscriptionChangeEvent;
  pushEvent.waitUntil(
    (async () => {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return;

      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const keys = newSub.toJSON().keys;
      if (!keys) return;

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: newSub.endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        }),
      });
    })()
  );
});

serwist.addEventListeners();
