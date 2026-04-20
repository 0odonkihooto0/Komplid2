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

// Заглушки для Фазы 4 (Push-уведомления)
self.addEventListener('push', () => {});
self.addEventListener('notificationclick', () => {});

serwist.addEventListeners();
