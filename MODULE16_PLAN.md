# Модуль 16 — PWA (Progressive Web App)

> **Версия:** v1 (апрель 2026)
> **Статус:** 🔄 частично (next-pwa базово настроен — см. ROADMAP Модуль 16)
> **Ориентир:** 6 недель (6 фаз)
> **Блокирующий для:** Модуль 15, Фаза 7 (Прораб-Журнал — mobile-first Профи-пакет)

---

## 0. Обзор и контекст

### 0.1. Почему PWA, а не нативка

Строительная отрасль РФ — **70% пользователей на Android**, с разномастными моделями (Xiaomi, Huawei, Samsung, Realme). Нативное приложение потребует:
- две кодовые базы (iOS + Android)
- публикация в App Store / RuStore / Huawei AppGallery (политики, апрувы, комиссии)
- отдельная команда / время на CI для мобильной сборки
- Apple не разрешает публикацию приложений, которые «просто обёртки над веб-сайтом» (App Store Guidelines 4.2)

PWA даёт **90% возможностей нативки при 10% затрат**:
- одна кодовая база = тот же Next.js 15 App Router
- установка на home screen без магазинов (как нативное)
- оффлайн-работа, push-уведомления, камера, GPS, фоновая синхронизация
- мгновенные обновления (не нужен release-процесс)

### 0.2. Что уже есть в проекте

Согласно `ROADMAP.md` и `docs/stack.md`:
- ✅ `next-pwa` установлен, базовый кэш статики работает
- ✅ Модель `Photo` с GPS (`gpsLat`, `gpsLng`, `takenAt`) — полиморфная привязка
- ✅ Модель `Notification` с типизированными событиями
- ✅ Email-уведомления через BullMQ + SMTP (`notification.worker.ts`)
- ✅ Redis-очереди (Timeweb Managed Redis)
- ✅ Timeweb S3 для файлов (`getDownloadUrl`, `generateUploadUrl`)
- ✅ Съёмка через браузерную камеру (`<input type=file accept="image/*" capture="environment">`)

**Проблема:** `next-pwa` — устаревший пакет, последние коммиты 2022 года. Автор рекомендует мигрировать на **Serwist** — форк Workbox активно поддерживается (последний релиз январь 2026).

### 0.3. Что ломается без полноценного PWA

Без Модуля 16 следующие сценарии **невозможны** или сильно ухудшены:
1. **Прораб на объекте без связи** — не может записать ОЖР (3G на стройке «скачет»)
2. **СК-инспектор без связи** — зафиксировал дефект, но фото не загрузились, потерял
3. **Push-уведомления** о срочных замечаниях, приближении дедлайна АОСР
4. **Установка на home screen** — у пользователя в браузере нет вашего приложения «всегда под рукой»
5. **Геозоны** — подтверждение, что ИТР физически был на объекте при подписании акта

### 0.4. Стратегия

Четыре приоритета по убыванию ценности:

1. **Offline-first ЖУРНАЛЫ и ФОТО** — главный use case прораба/СК-инспектора. Он пишет запись, делает фото, продолжает работать. Когда связь есть — всё синхронизируется.
2. **Push-уведомления** — возврат пользователей в приложение (непрочитанные замечания, согласования, дедлайны).
3. **Установка как native** — install prompt, манифест, иконки, splash.
4. **Геозоны и специфичные мобильные UX** — быстрый доступ к камере, голосовой ввод, 2–3 тапа до частых действий.

---

## 1. Архитектура

### 1.1. Слоистая модель

```
┌─────────────────────────────────────────────────────────────┐
│ 4. UI Layer (React компоненты, mobile-first)                │
│    MobileShell · QuickForms · InstallPrompt · OfflineBanner │
├─────────────────────────────────────────────────────────────┤
│ 3. Data Layer (local-first reads & writes)                  │
│    - useOfflineQuery  (чтение сначала из IndexedDB)         │
│    - useOfflineMutation (запись в IDB + очередь)            │
├─────────────────────────────────────────────────────────────┤
│ 2. Storage Layer (IndexedDB через idb)                      │
│    stores: journal-drafts · photos-queue · sync-queue       │
│            snapshots (cache SSR-данных)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Service Worker (Serwist → Workbox)                       │
│    - Precache shell  - RuntimeCache API  - Background Sync  │
│    - Push handler    - Notification click handler           │
└─────────────────────────────────────────────────────────────┘
                            ↕
                    Next.js API + S3
```

**Принцип offline-first:** UI никогда не ждёт сети. Все мутации пишутся в IndexedDB сначала, затем отправляются в API. Если сеть есть — сразу, если нет — через очередь sync.

### 1.2. Ключевые библиотеки

| Библиотека | Зачем | Статус |
|------------|-------|--------|
| `@serwist/next` + `serwist` | Service Worker (замена next-pwa) | установить |
| `idb` | Промис-обёртка над IndexedDB | установить |
| `web-push` | Отправка push с бэкенда (VAPID) | установить |
| `browser-image-compression` | Сжатие фото перед загрузкой | уже в проекте |
| `zustand` | Состояние оффлайн/онлайн/синк | уже в проекте |

Никаких новых тяжёлых зависимостей. Всё в экосистеме Web API без сторонних платных сервисов (Firebase/OneSignal) — это важно для ФЗ-152.

### 1.3. Почему Serwist, а не next-pwa

| | next-pwa | @serwist/next |
|---|----------|----------------|
| Последний релиз | 2022 | январь 2026 |
| Next.js 15 App Router | Не всё работает | Полная поддержка |
| TypeScript | Частично | First-class |
| Workbox версия | v6 (EOL) | v7+ |
| Автор next-pwa рекомендует? | — | **Да, официально** |

---

## 2. Карта фаз

```
Фаза 1 (нед. 1):   Service Worker & Manifest   ⬜  фундамент
Фаза 2 (нед. 2):   IndexedDB & Sync Queue      ⬜  offline storage
Фаза 3 (нед. 3):   Offline-first UI hooks      ⬜  мутации через очередь
Фаза 4 (нед. 4):   Push-уведомления (VAPID)    ⬜  возвращение юзера
Фаза 5 (нед. 5):   Камера · GPS · Геозоны      ⬜  мобильные возможности
Фаза 6 (нед. 6):   Mobile-first shell & polish ⬜  UX и установка
```

Каждая фаза — отдельный PR. После Фазы 2 уже можно подключать offline к конкретным модулям (Журналы, Фото).

---

# ФАЗА 1 — Service Worker и Manifest (1 неделя) ⬜

> **Цель:** заменить `next-pwa` на Serwist, настроить манифест, precache app shell, офлайн-fallback.

## Шаг 1.1 — Миграция с next-pwa на Serwist (День 1)

### 1.1.1. Команда для Claude Code

````
📋 ЗАДАЧА: Заменить next-pwa на Serwist

Контекст: next-pwa не поддерживается с 2022, автор рекомендует Serwist.
Serwist = форк Workbox, активно поддерживается, first-class TypeScript.

Шаг 1. Удалить старое:
```bash
npm uninstall next-pwa
```
Удалить в public/ старые файлы: sw.js, workbox-*.js, worker-*.js (если есть).

Шаг 2. Установить Serwist:
```bash
npm i @serwist/next
npm i -D serwist
```

Шаг 3. Обновить next.config.mjs:
```typescript
import withSerwistInit from '@serwist/next';

const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  swSrc: 'src/sw/index.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

export default withSerwist({
  // существующие настройки next.config
});
```

Шаг 4. Создать src/sw/index.ts (см. следующий шаг)

Шаг 5. Обновить tsconfig.json:
```json
{
  "compilerOptions": {
    "lib": [..., "webworker"],
    "types": [..., "@serwist/next/typings"]
  },
  "exclude": [..., "public/sw.js"]
}
```

Шаг 6. Проверка:
- npm run build → должен сгенерироваться public/sw.js
- npx tsc --noEmit — зелёный
- В DevTools → Application → Service Workers видно "serwist" активный

ВАЖНО: next-pwa в dev-режиме отключён — это нормально, service worker работает
только в production build.

Тест в dev:
1. npm run build && npm start
2. Chrome DevTools → Application → Service Workers
3. Проверить "Source" = /sw.js, статус "activated and is running"
````

---

## Шаг 1.2 — Service Worker с кэш-стратегиями (День 2)

### 1.2.1. Концепция кэш-стратегий

Разные типы ресурсов требуют разных стратегий:

| Тип ресурса | Стратегия | Обоснование |
|-------------|-----------|-------------|
| Next.js статика (`_next/static/*`) | **CacheFirst** | immutable, хэш в имени |
| Шрифты, иконки | **CacheFirst** | immutable |
| Картинки (S3, `/images/*`) | **StaleWhileRevalidate** | могут обновляться |
| GET API (`/api/*`) | **NetworkFirst** (3 сек timeout) | свежие данные важнее |
| POST/PUT/DELETE API | **NetworkOnly** + Background Sync | не кэшируется, очередь при offline |
| Навигация (HTML-страницы) | **NetworkFirst** (3 сек) → precache fallback | оффлайн-страница |
| Аутентификация (`/api/auth/*`) | **NetworkOnly** | не кэшировать логин/сессии |

### 1.2.2. Команда для Claude Code

````
📋 ЗАДАЧА: Service Worker с продуманными кэш-стратегиями

Файл: src/sw/index.ts

```typescript
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
  maxRetentionTime: 24 * 60,  // хранить до 24 часов в очереди
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

    // Webhook и внутренние крон-роуты — NetworkOnly
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/webhooks/') ||
        url.pathname.startsWith('/api/cron/'),
      handler: new NetworkOnly(),
    },

    // GET API — NetworkFirst с 3-сек таймаутом
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
            maxAgeSeconds: 60 * 60,  // 1 час
          }),
        ],
      }),
    },

    // Мутации (POST/PUT/PATCH/DELETE) — NetworkOnly + BackgroundSync
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith('/api/') &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
      handler: new NetworkOnly({
        plugins: [API_BG_SYNC_PLUGIN],
      }),
    },

    // S3 pre-signed URLs (картинки, PDF) — StaleWhileRevalidate
    {
      matcher: ({ url }) =>
        url.hostname.includes('timeweb') || url.hostname.includes('s3'),
      handler: new StaleWhileRevalidate({
        cacheName: 'stroydocs-s3-assets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7,  // 7 дней
          }),
        ],
      }),
    },

    // Шрифты — CacheFirst
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

    // Next.js images - StaleWhileRevalidate
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

    // Остальное — дефолт Serwist
    ...defaultCache,
  ],

  // Offline fallback для навигации
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

// Push-уведомления (Фаза 4)
self.addEventListener('push', (event) => {
  // реализация в Фазе 4
});

// Click на notification (Фаза 4)
self.addEventListener('notificationclick', (event) => {
  // реализация в Фазе 4
});

serwist.addEventListeners();
```

Создать также страницу оффлайн-fallback:
Файл: src/app/~offline/page.tsx
```tsx
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <svg className="w-16 h-16 text-muted-foreground" ...>
        {/* иконка «нет сети» */}
      </svg>
      <h1 className="text-2xl font-semibold">Нет подключения</h1>
      <p className="text-muted-foreground max-w-md">
        Кажется, вы в офлайне. Просмотреть кэшированные страницы можно, но
        новые действия отправятся автоматически, когда связь появится.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-md bg-primary text-white"
      >
        Попробовать снова
      </button>
    </main>
  );
}
```

Проверка:
- npm run build && npm start
- DevTools → Application → Service Workers → Offline toggle
- Обновить страницу → отобразится /~offline
- При восстановлении сети — приложение работает
- Мутации, сделанные в offline, попадают в Background Sync
  (DevTools → Application → Background Services → Background Sync)
````

---

## Шаг 1.3 — Web App Manifest (День 3)

### 1.3.1. Манифест

Манифест определяет, как приложение выглядит и ведёт себя после установки на home screen.

````
📋 ЗАДАЧА: Полноценный Web App Manifest

Файл: src/app/manifest.ts (App Router, динамическая генерация)

```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StroyDocs — Цифровое управление строительством',
    short_name: 'StroyDocs',
    description:
      'Исполнительная документация, журналы работ, стройконтроль. Работает офлайн.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#2563EB',  // акцентный синий из дизайн-системы
    lang: 'ru',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/icons/icon-144.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/icons/icon-152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],

    // Shortcuts — быстрые действия при долгом нажатии на иконку
    shortcuts: [
      {
        name: 'Новая запись в ОЖР',
        short_name: 'Запись ОЖР',
        description: 'Быстро добавить запись в журнал работ',
        url: '/mobile/quick/journal-entry?utm_source=shortcut',
        icons: [{ src: '/icons/shortcut-journal.png', sizes: '96x96' }],
      },
      {
        name: 'Фото с GPS',
        short_name: 'Фото',
        description: 'Сделать фото объекта',
        url: '/mobile/quick/photo?utm_source=shortcut',
        icons: [{ src: '/icons/shortcut-camera.png', sizes: '96x96' }],
      },
      {
        name: 'Зафиксировать дефект',
        short_name: 'Дефект',
        description: 'Фиксация нарушения с фото',
        url: '/mobile/quick/defect?utm_source=shortcut',
        icons: [{ src: '/icons/shortcut-defect.png', sizes: '96x96' }],
      },
    ],

    // Screenshots — показываются в install prompt на Android
    screenshots: [
      {
        src: '/screenshots/mobile-journal.png',
        sizes: '540x1170',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Журнал работ',
      },
      {
        src: '/screenshots/mobile-photo.png',
        sizes: '540x1170',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Фото с GPS',
      },
      {
        src: '/screenshots/desktop-dashboard.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Дашборд',
      },
    ],
  };
}
```

Иконки нужно подготовить (design-задача):
- icon-72, 96, 128, 144, 152, 192, 512 — обычные (any)
- icon-192-maskable, icon-512-maskable — с safe zone 80% для Android adaptive icons
- shortcut-* — 96×96 PNG для быстрых действий
- screenshots — 540×1170 для mobile, 1920×1080 для desktop

ВРЕМЕННО (пока нет иконок): сгенерировать через https://realfavicongenerator.net
из существующего логотипа, положить в public/icons/.

Файл: src/app/layout.tsx — добавить в <head>:
```tsx
export const metadata: Metadata = {
  applicationName: 'StroyDocs',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StroyDocs',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,  // предотвращает zoom на input focus в iOS
};
```

Проверка:
- curl https://app.stroydocs.ru/manifest.webmanifest → валидный JSON
- Chrome DevTools → Application → Manifest → все иконки загружаются
- Lighthouse PWA audit → manifest OK
- На Android/iOS можно «Добавить на главный экран»
````

---

## Шаг 1.4 — InstallPrompt компонент (День 4)

````
📋 ЗАДАЧА: Компонент промпта установки

Проблема: beforeinstallprompt event работает в Chrome/Edge/Opera, но НЕ в Safari iOS.
В Safari iOS установка только через "Поделиться → На экран Домой", автоматически не вызывается.

Решение: два разных компонента для двух сценариев.

Файл: src/components/pwa/InstallPromptAndroid.tsx
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_STORAGE_KEY = 'pwa-install-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

export function InstallPromptAndroid() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <Download className="w-6 h-6 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">Установить StroyDocs</div>
          <div className="text-sm text-muted-foreground">
            Доступ с главного экрана, работает офлайн
          </div>
        </div>
        <Button size="sm" onClick={handleInstall}>Установить</Button>
        <Button size="icon" variant="ghost" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

Файл: src/components/pwa/InstallPromptIos.tsx
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Share } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'pwa-install-ios-dismissed-at';

export function InstallPromptIos() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Только iOS Safari, не в standalone режиме
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/(CriOS|FxiOS)/.test(ua);
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (!isIos || isStandalone) return;

    const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Показать после 30 секунд на сайте
    const timer = setTimeout(() => setIsVisible(true), 30_000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50">
      <CardContent className="p-4 relative">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="absolute top-2 right-2"
        >
          <X className="w-4 h-4" />
        </Button>
        <div className="font-medium mb-2">Установите StroyDocs на iPhone</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>1. Нажмите <Share className="w-4 h-4 inline" /> в нижней панели Safari</div>
          <div>2. Выберите «На экран «Домой»»</div>
        </div>
      </CardContent>
    </Card>
  );
}
```

Монтировать в src/app/layout.tsx:
```tsx
import { InstallPromptAndroid } from '@/components/pwa/InstallPromptAndroid';
import { InstallPromptIos } from '@/components/pwa/InstallPromptIos';

// внутри <body>:
<InstallPromptAndroid />
<InstallPromptIos />
```

Проверка:
- Android Chrome: через 1 раз посещение — появляется баннер установки
- iOS Safari: через 30 секунд появляется подсказка
- После установки (standalone mode) — промпты не показываются
- После Dismiss — 7 дней не показывается
````

---

## Шаг 1.5 — Детект онлайн/оффлайн, статус-бар (День 5)

````
📋 ЗАДАЧА: Zustand store для сетевого статуса + UI

Файл: src/stores/network-store.ts
```typescript
import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  wasOffline: boolean;  // был ли оффлайн в этой сессии
  setOnline: (online: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  wasOffline: false,
  setOnline: (online: boolean) => {
    const prev = get().isOnline;
    if (prev === online) return;
    set({
      isOnline: online,
      wasOffline: get().wasOffline || !online,
    });
  },
}));
```

Файл: src/components/pwa/NetworkListener.tsx
```tsx
'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network-store';

export function NetworkListener() {
  const setOnline = useNetworkStore((s) => s.setOnline);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Первичная инициализация
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return null;
}
```

Файл: src/components/pwa/OfflineBanner.tsx
```tsx
'use client';

import { useNetworkStore } from '@/stores/network-store';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-500 text-amber-950 text-sm text-center py-1.5 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>Нет подключения. Изменения сохранятся и синхронизируются позже.</span>
    </div>
  );
}
```

Файл: src/components/pwa/BackOnlineToast.tsx
```tsx
'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network-store';
import { toast } from 'sonner';  // или используемая в проекте toast-библиотека

export function BackOnlineToast() {
  const { isOnline, wasOffline } = useNetworkStore();

  useEffect(() => {
    if (isOnline && wasOffline) {
      toast.success('Соединение восстановлено. Синхронизация...', {
        duration: 3000,
      });
    }
  }, [isOnline, wasOffline]);

  return null;
}
```

Подключить в src/app/layout.tsx (всё в корне приложения):
```tsx
<NetworkListener />
<OfflineBanner />
<BackOnlineToast />
```

ВАЖНО: navigator.onLine НЕ всегда надёжен. Он говорит «у сетевого адаптера есть
маршрут», но не «сервер доступен». Для критичных проверок — дополнить heartbeat
пингом на /api/ping раз в 30 сек:

Файл: src/app/api/ping/route.ts
```typescript
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}
```

Расширить NetworkListener — heartbeat для уточнения статуса.

Проверка:
- DevTools → Network → Offline — появляется янтарный баннер
- Отключить сеть физически (Airplane mode) — баннер появляется
- При восстановлении — toast
````

---

# ФАЗА 2 — IndexedDB и sync queue (1 неделя) ⬜

> **Цель:** построить local-first хранилище на базе `idb`. Все мутации — сначала в IDB, потом в API.

## Шаг 2.1 — Схема IndexedDB и wrapper (День 1–2)

````
📋 ЗАДАЧА: Инициализация IndexedDB на базе idb

Установить:
npm install idb

Файл: src/lib/idb/db.ts

```typescript
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ─────────────────────────────────────────────
// Типы данных в IDB
// ─────────────────────────────────────────────

export interface SyncQueueItem {
  id: string;                    // UUID, клиентский
  url: string;                   // относительный путь к API
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: string | null;           // JSON.stringify или null
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';

  // Для UI — какой сущности это мутация
  entityType: 'journal_entry' | 'photo' | 'defect' | 'remark' | 'other';
  entityId?: string;             // ID связанной сущности (для группировки)
  description?: string;          // «Запись ОЖР №123» — показывать юзеру

  lastError?: string;
  lastTriedAt?: number;
}

export interface OfflineJournalEntry {
  clientId: string;              // UUID, создан в оффлайне
  serverId?: string;              // получен после синхронизации
  journalId: string;
  entryNumber?: string;
  date: string;                  // ISO
  description: string;
  data: Record<string, unknown>; // type-specific fields
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  updatedAt: number;
  attachmentClientIds: string[]; // ссылки на offline-фото
}

export interface OfflinePhoto {
  clientId: string;
  serverId?: string;
  blob: Blob;                    // сам файл (сохраняется в IDB)
  fileName: string;
  mimeType: string;
  size: number;

  // Метаданные
  entityType: string;            // 'JOURNAL_ENTRY' | 'DEFECT' | ...
  entityClientId?: string;       // для оффлайн-сущностей
  entityServerId?: string;       // для уже синхронизированных

  gpsLat?: number;
  gpsLng?: number;
  takenAt: number;
  category?: 'CONFIRMING' | 'VIOLATION';

  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed';
  uploadProgress: number;        // 0..100
  createdAt: number;
}

export interface CacheSnapshot {
  key: string;                   // URL API запроса
  data: unknown;                 // response.json()
  cachedAt: number;
  ttl: number;                   // через сколько мс считать stale
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
      'by-entity': string;  // entityType
    };
  };
  'offline-journal-entries': {
    key: string;             // clientId
    value: OfflineJournalEntry;
    indexes: {
      'by-journal': string;   // journalId
      'by-sync-status': string;
    };
  };
  'offline-photos': {
    key: string;             // clientId
    value: OfflinePhoto;
    indexes: {
      'by-entity': string;     // entityClientId | entityServerId
      'by-sync-status': string;
    };
  };
  'cache-snapshots': {
    key: string;             // URL
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
        // sync-queue
        if (!db.objectStoreNames.contains('sync-queue')) {
          const queueStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-timestamp', 'timestamp');
          queueStore.createIndex('by-entity', 'entityType');
        }

        // offline-journal-entries
        if (!db.objectStoreNames.contains('offline-journal-entries')) {
          const journalStore = db.createObjectStore('offline-journal-entries', {
            keyPath: 'clientId',
          });
          journalStore.createIndex('by-journal', 'journalId');
          journalStore.createIndex('by-sync-status', 'syncStatus');
        }

        // offline-photos
        if (!db.objectStoreNames.contains('offline-photos')) {
          const photoStore = db.createObjectStore('offline-photos', {
            keyPath: 'clientId',
          });
          photoStore.createIndex('by-entity', 'entityClientId');
          photoStore.createIndex('by-sync-status', 'syncStatus');
        }

        // cache-snapshots
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
        // Текущая вкладка мешает апгрейду новой версии
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
    });
  }
  return dbPromise;
}
```

Файл: src/lib/idb/quota.ts — мониторинг квоты
```typescript
export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
    percent: estimate.quota
      ? Math.round(((estimate.usage ?? 0) / estimate.quota) * 100)
      : 0,
  };
}

/// Запросить persistent storage — IDB не вылетит при низкой памяти
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) return true;
  return await navigator.storage.persist();
}
```

Вызвать requestPersistentStorage() в layout.tsx после регистрации SW.

Проверка:
- DevTools → Application → IndexedDB → stroydocs-offline → 4 object stores
- Schema совпадает с описанной выше
- navigator.storage.persisted() возвращает true
````

---

## Шаг 2.2 — Repository-паттерн для каждого стора (День 3)

````
📋 ЗАДАЧА: Тонкие репозитории для работы с IDB

Файл: src/lib/idb/repos/sync-queue-repo.ts
```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDB, type SyncQueueItem } from '../db';

export const syncQueueRepo = {
  async enqueue(params: {
    url: string;
    method: SyncQueueItem['method'];
    body?: unknown;
    headers?: Record<string, string>;
    entityType: SyncQueueItem['entityType'];
    entityId?: string;
    description?: string;
  }): Promise<SyncQueueItem> {
    const db = await getDB();
    const item: SyncQueueItem = {
      id: uuidv4(),
      url: params.url,
      method: params.method,
      headers: {
        'Content-Type': 'application/json',
        ...params.headers,
      },
      body: params.body ? JSON.stringify(params.body) : null,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
    };
    await db.add('sync-queue', item);
    return item;
  },

  async listPending(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAllFromIndex('sync-queue', 'by-status', 'pending');
  },

  async listAll(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAll('sync-queue');
  },

  async markSyncing(id: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('sync-queue', id);
    if (!item) return;
    item.status = 'syncing';
    item.lastTriedAt = Date.now();
    await db.put('sync-queue', item);
  },

  async markCompleted(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('sync-queue', id);  // удаляем сразу после успеха
  },

  async markFailed(id: string, error: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('sync-queue', id);
    if (!item) return;
    item.status = 'failed';
    item.retryCount += 1;
    item.lastError = error;
    item.lastTriedAt = Date.now();
    await db.put('sync-queue', item);
  },

  async resetFailed(): Promise<void> {
    const db = await getDB();
    const failed = await db.getAllFromIndex('sync-queue', 'by-status', 'failed');
    const tx = db.transaction('sync-queue', 'readwrite');
    for (const item of failed) {
      item.status = 'pending';
      await tx.store.put(item);
    }
    await tx.done;
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('sync-queue');
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('sync-queue');
  },
};
```

Аналогично создать:
- src/lib/idb/repos/journal-entries-repo.ts — CRUD по OfflineJournalEntry
- src/lib/idb/repos/photos-repo.ts — CRUD по OfflinePhoto
- src/lib/idb/repos/cache-snapshots-repo.ts — CRUD по CacheSnapshot

ПРАВИЛО: репозитории — ТОЛЬКО примитивные CRUD.
Бизнес-логика (что в какой стор пишем, когда создаём entry) — в useOfflineMutation (Фаза 3).

Проверка:
- Написать unit-тесты для каждого репо (fake-indexeddb для jest)
- 100% покрытие CRUD операций
- Проверить edge cases: создание при заполненной квоте, удаление несуществующего
````

---

## Шаг 2.3 — Sync Manager (процессор очереди) (День 4–5)

````
📋 ЗАДАЧА: Менеджер синхронизации

Центральный класс, который разгребает очередь. Запускается:
1. При `online` event (из NetworkListener)
2. При загрузке приложения, если в очереди есть pending
3. Ручная кнопка «Синхронизировать сейчас»

Файл: src/lib/idb/sync-manager.ts

```typescript
import { syncQueueRepo } from './repos/sync-queue-repo';
import { photosRepo } from './repos/photos-repo';
import { journalEntriesRepo } from './repos/journal-entries-repo';

const MAX_RETRY_COUNT = 5;
const RETRY_BACKOFF_MS = [1000, 5000, 15000, 60000, 300000];  // exp backoff

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
    for (const l of this.listeners) l(event);
  }

  async sync(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Сначала загружаем оффлайн-фото (они тяжёлые, но независимы от API-queue)
      await this.uploadPendingPhotos();

      // 2. Потом разгребаем API-очередь (которая может ссылаться на загруженные s3Key)
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
        // Item с исчерпанными попытками — помечаем failed и пропускаем
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
          credentials: 'include',  // отправлять session cookie
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');

          // 4xx — клиентская ошибка, ретрай бесполезен (кроме 401/408/429)
          if (response.status >= 400 && response.status < 500) {
            if (![401, 408, 429].includes(response.status)) {
              // Постоянная ошибка — помечаем failed навсегда
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

        // Успех
        await syncQueueRepo.markCompleted(item.id);
        successful++;
        this.emit({ type: 'item-success', id: item.id });

        // Опциональный пост-обработчик:
        // например, если это был POST /journals/:id/entries, то сохраняем
        // serverId в offline-journal-entries store и убираем «pending» статус
        await this.postProcessSuccess(item, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await syncQueueRepo.markFailed(item.id, message);
        failed++;
        this.emit({ type: 'item-failed', id: item.id, error: message });

        // Backoff перед следующим item
        const backoff = RETRY_BACKOFF_MS[Math.min(item.retryCount, RETRY_BACKOFF_MS.length - 1)];
        await sleep(Math.min(backoff, 5000));  // кэп 5 сек чтобы не блокировать на старте
      }

      this.emit({
        type: 'progress',
        completed: i + 1,
        total: pending.length,
      });
    }

    this.emit({ type: 'finished', successful, failed });
  }

  private async uploadPendingPhotos(): Promise<void> {
    const pending = await photosRepo.listPendingUpload();

    for (const photo of pending) {
      try {
        await photosRepo.markUploading(photo.clientId);

        // 1. Запросить pre-signed URL
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
        const { data } = await res.json();
        const { photo: serverPhoto, uploadUrl } = data;

        // 2. Загрузить бинарник
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: photo.blob,
          headers: { 'Content-Type': photo.mimeType },
        });
        if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

        // 3. Пометить synced
        await photosRepo.markSynced(photo.clientId, serverPhoto.id);
      } catch (error) {
        await photosRepo.markFailed(photo.clientId);
        // Не прерываем, идём дальше
      }
    }
  }

  private async postProcessSuccess(
    item: SyncQueueItem,
    response: Response
  ): Promise<void> {
    if (item.entityType === 'journal_entry' && item.method === 'POST') {
      // При создании offline journal entry — маркаем его как synced
      try {
        const body = await response.clone().json();
        const serverId = body?.data?.id;
        if (item.entityId && serverId) {
          await journalEntriesRepo.markSynced(item.entityId, serverId);
        }
      } catch {
        // игнорируем — запись уже создана на сервере
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const syncManager = new SyncManager();
```

Файл: src/components/pwa/SyncTrigger.tsx — автотриггер при online
```tsx
'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network-store';
import { syncManager } from '@/lib/idb/sync-manager';

export function SyncTrigger() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  useEffect(() => {
    if (isOnline) {
      // Небольшая задержка чтобы не конфликтовать с Background Sync
      const timer = setTimeout(() => syncManager.sync(), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Также — первичная синхронизация при загрузке приложения
  useEffect(() => {
    if (navigator.onLine) {
      syncManager.sync();
    }
  }, []);

  return null;
}
```

Подключить в layout.tsx.

ВАЖНО — обработка 401:
Если API вернёт 401, sync остановится и item останется в pending. Это правильно:
пользователь переавторизуется, и очередь подхватится сама.

Тестирование:
1. Зайти в offline mode
2. Сделать POST запрос через useOfflineMutation (Фаза 3)
3. Убедиться что он в sync-queue со status=pending
4. Вернуть online
5. Убедиться что status=completed и item удалён из IDB
6. Убедиться что запись появилась на сервере
````

---

# ФАЗА 3 — Offline-first hooks (1 неделя) ⬜

> **Цель:** API для разработчиков: `useOfflineMutation` и `useOfflineQuery`. Прозрачная работа с IDB + API.

## Шаг 3.1 — useOfflineMutation (День 1–2)

````
📋 ЗАДАЧА: Хук optimistic-мутации с очередью

Философия:
- Пишем в IDB сразу (optimistic)
- Пробуем fetch() в API
- Если online успешно — mark synced
- Если offline или fail — в sync-queue, будет обработано позже

Файл: src/hooks/use-offline-mutation.ts

```typescript
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { syncQueueRepo } from '@/lib/idb/repos/sync-queue-repo';
import { useNetworkStore } from '@/stores/network-store';

interface OfflineMutationConfig<TData, TVariables> {
  url: string | ((variables: TVariables) => string);
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  entityType:
    | 'journal_entry'
    | 'photo'
    | 'defect'
    | 'remark'
    | 'other';
  entityIdFromVars?: (variables: TVariables) => string | undefined;
  getDescription?: (variables: TVariables) => string;
  optimisticUpdate?: (variables: TVariables) => Promise<void> | void;
  onServerSuccess?: (data: TData, variables: TVariables) => Promise<void> | void;
}

export function useOfflineMutation<TData = unknown, TVariables = unknown>(
  config: OfflineMutationConfig<TData, TVariables>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const isOnline = useNetworkStore.getState().isOnline;

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const url =
        typeof config.url === 'function' ? config.url(variables) : config.url;

      // 1. Optimistic update в IDB
      await config.optimisticUpdate?.(variables);

      // 2. Если онлайн — пробуем прямо API
      if (isOnline) {
        try {
          const response = await fetch(url, {
            method: config.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variables),
            credentials: 'include',
          });

          if (response.ok) {
            const data: TData = await response.json();
            await config.onServerSuccess?.(data, variables);
            return data;
          }

          // 4xx (кроме network-transients) — вернуть ошибку
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}`);
          }
          // 5xx — fallthrough к очереди
        } catch (error) {
          // Network error — fallthrough к очереди
        }
      }

      // 3. Offline или упал запрос — в очередь
      await syncQueueRepo.enqueue({
        url,
        method: config.method,
        body: variables,
        entityType: config.entityType,
        entityId: config.entityIdFromVars?.(variables),
        description: config.getDescription?.(variables),
      });

      // Возвращаем null — UI должен обрабатывать "ожидает синхронизации"
      return null as unknown as TData;
    },
    ...options,
  });
}
```

Пример использования: создание записи в ОЖР
```tsx
// src/hooks/use-create-journal-entry.ts
import { useOfflineMutation } from '@/hooks/use-offline-mutation';
import { journalEntriesRepo } from '@/lib/idb/repos/journal-entries-repo';
import { v4 as uuidv4 } from 'uuid';

interface CreateJournalEntryVars {
  journalId: string;
  projectId: string;
  date: string;
  description: string;
  data: Record<string, unknown>;
}

export function useCreateJournalEntry() {
  return useOfflineMutation({
    url: (v) => `/api/projects/${v.projectId}/journals/${v.journalId}/entries`,
    method: 'POST',
    entityType: 'journal_entry',
    entityIdFromVars: (v) => v.__clientId as string,  // см. optimisticUpdate
    getDescription: (v) => `Запись в журнале «${v.description.slice(0, 40)}»`,

    optimisticUpdate: async (variables) => {
      const clientId = uuidv4();
      (variables as any).__clientId = clientId;

      await journalEntriesRepo.create({
        clientId,
        journalId: variables.journalId,
        date: variables.date,
        description: variables.description,
        data: variables.data,
        syncStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachmentClientIds: [],
      });
    },

    onServerSuccess: async (data, variables) => {
      // Серверный id получен — обновляем запись в IDB
      const clientId = (variables as any).__clientId;
      if (clientId && (data as any)?.data?.id) {
        await journalEntriesRepo.markSynced(clientId, (data as any).data.id);
      }
    },
  });
}
```

UI-компонент:
```tsx
const createMutation = useCreateJournalEntry();

const handleSave = () => {
  createMutation.mutate({
    journalId,
    projectId,
    date: new Date().toISOString(),
    description,
    data: {},
  });
};
```

Даже если offline — вызов завершится успешно, UI обновится оптимистично,
когда будет сеть — серверный id получится.

Проверка:
- Offline mode: mutate → запись появляется в IDB со syncStatus='pending'
- Online: запись создаётся на сервере, получает serverId, syncStatus='synced'
- Offline + online: запись попадает в sync-queue, при online — синхронизируется
````

---

## Шаг 3.2 — useOfflineQuery (День 3–4)

````
📋 ЗАДАЧА: Хук для чтения с кешем в IDB (stale-while-revalidate)

Принцип:
1. Моментально возвращает данные из IDB (если есть)
2. В фоне делает fetch из API
3. Обновляет IDB и UI когда пришли свежие данные
4. Offline — только данные из IDB

Файл: src/hooks/use-offline-query.ts

```typescript
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { cacheSnapshotsRepo } from '@/lib/idb/repos/cache-snapshots-repo';
import { useNetworkStore } from '@/stores/network-store';

interface OfflineQueryConfig<TData> {
  key: string;                   // уникальный ключ в IDB (обычно = URL)
  url: string;                   // относительный
  ttlMs?: number;                // срок актуальности кеша
  // Функция для извлечения списка сущностей из ответа (если хотим также
  // писать их в соотв. репо — опционально)
  // не реализуем на первом этапе
}

export function useOfflineQuery<TData = unknown>(
  config: OfflineQueryConfig<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  const isOnline = useNetworkStore.getState().isOnline;
  const { key, url, ttlMs = 5 * 60 * 1000 } = config;

  return useQuery<TData, Error>({
    queryKey: ['offline-query', key],
    queryFn: async () => {
      // 1. Попробовать IDB-кэш
      const cached = await cacheSnapshotsRepo.get(key);

      // 2. Если online — fetch в фоне
      if (isOnline) {
        try {
          const response = await fetch(url, { credentials: 'include' });
          if (response.ok) {
            const data: TData = await response.json();
            await cacheSnapshotsRepo.set(key, data, ttlMs);
            return data;
          }
          // 4xx: возвращаем кэш если есть, иначе ошибка
        } catch (error) {
          // Network fail: fallthrough к кэшу
        }
      }

      // 3. Offline или fetch упал — возвращаем кэш
      if (cached) {
        return cached.data as TData;
      }

      // Ничего нет
      throw new Error('No cached data and network unavailable');
    },
    ...options,
  });
}
```

Применение:
```tsx
// src/hooks/use-journal-entries.ts
export function useJournalEntries(journalId: string, projectId: string) {
  return useOfflineQuery({
    key: `journal-entries:${projectId}:${journalId}`,
    url: `/api/projects/${projectId}/journals/${journalId}/entries`,
    ttlMs: 5 * 60 * 1000,
  });
}
```

ВАЖНО — комбинированное чтение:
Для offline-first чтения журналов нужен еще смерджер: данные из IDB + pending entries
из offline-journal-entries, которые ещё не синхронизированы. Это в Фазе 7 (UI).

Проверка:
- Offline, нет кэша → error
- Online, fetch → IDB записан, данные в UI
- Offline после кэширования → данные из IDB
````

---

## Шаг 3.3 — UI-компонент очереди синхронизации (День 5)

````
📋 ЗАДАЧА: Виджет «Ожидают синхронизации»

Файл: src/components/pwa/SyncQueuePanel.tsx

Pop-up или drawer, показывающий что в очереди:
- Сколько items в pending/failed
- По сущностям: 3 записи ОЖР, 5 фото, 2 замечания
- Кнопка «Синхронизировать сейчас» (ручной триггер)
- Для failed: «Повторить» (переводит в pending)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { syncQueueRepo } from '@/lib/idb/repos/sync-queue-repo';
import { syncManager } from '@/lib/idb/sync-manager';
import { useNetworkStore } from '@/stores/network-store';
import type { SyncQueueItem } from '@/lib/idb/db';

export function SyncQueuePanel() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = async () => {
    setItems(await syncQueueRepo.listAll());
  };

  useEffect(() => {
    refresh();
    // Подписываемся на события SyncManager
    const unsub = syncManager.subscribe((event) => {
      if (event.type === 'started') setIsSyncing(true);
      if (event.type === 'finished') {
        setIsSyncing(false);
        refresh();
      }
      if (event.type === 'item-success' || event.type === 'item-failed') {
        refresh();
      }
    });
    // Refresh каждые 3 сек на случай если что-то извне добавило
    const interval = setInterval(refresh, 3000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
  const failed = items.filter((i) => i.status === 'failed');
  const total = pending.length + failed.length;

  if (total === 0 && !isSyncing) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : isOnline ? (
            <Cloud className="w-4 h-4" />
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
          {total > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1">
              {total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="font-medium">
            {total > 0 ? `Ожидают синхронизации: ${total}` : 'Синхронизация...'}
          </div>

          {pending.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">В очереди</div>
              {pending.slice(0, 5).map((item) => (
                <div key={item.id} className="text-sm truncate">
                  {item.description ?? `${item.method} ${item.url}`}
                </div>
              ))}
              {pending.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  …и ещё {pending.length - 5}
                </div>
              )}
            </div>
          )}

          {failed.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-red-500">Не удалось отправить ({failed.length})</div>
              {failed.slice(0, 3).map((item) => (
                <div key={item.id} className="text-sm">
                  <div className="truncate">{item.description}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.lastError}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => syncManager.sync()}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Повторить
            </Button>
            {failed.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await syncQueueRepo.resetFailed();
                  refresh();
                }}
              >
                Сбросить ошибки
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

Подключить в шапку приложения (например, в MainSidebar или TopBar) — рядом с
уведомлениями и аватаром.

Проверка:
- Вижу компонент когда в очереди есть items
- Badge показывает правильное число
- Кнопка «Повторить» запускает syncManager.sync()
- Failed items видны отдельно
- После success — счётчик обновляется
````

---

# ФАЗА 4 — Push-уведомления (1 неделя) ⬜

> **Цель:** нативные push-уведомления через Web Push API + VAPID. Без Firebase, без OneSignal — ФЗ-152 чистый self-hosted.

## Шаг 4.1 — VAPID ключи и серверная инфра (День 1)

````
📋 ЗАДАЧА: Backend Web Push через web-push

Установить:
npm install web-push
npm install -D @types/web-push

Шаг 1. Сгенерировать VAPID keys (один раз):
```bash
npx web-push generate-vapid-keys --json
```
Вывод:
{
  "publicKey": "B...~90 символов",
  "privateKey": "... ~43 символа"
}

Шаг 2. Добавить в .env:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
VAPID_SUBJECT=mailto:admin@stroydocs.ru
```

Добавить в src/lib/env.ts в REQUIRED_ENV_VARS.

Шаг 3. Prisma-модель для подписок:
```prisma
model PushSubscription {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  endpoint    String   @unique  // URL push-сервиса браузера
  p256dhKey   String             // публичный ключ подписки (шифрование)
  authKey     String             // HMAC-ключ (аутентификация)

  userAgent   String?            // "Chrome on Android"
  deviceLabel String?            // "Xiaomi Redmi 9" — опционально, юзер вручную

  createdAt   DateTime @default(now())
  lastUsedAt  DateTime @default(now())

  @@index([userId])
  @@map("push_subscriptions")
}
```

В User:
```prisma
pushSubscriptions PushSubscription[]
```

Миграция:
npx prisma migrate dev --name add_push_subscriptions
npx prisma generate

Шаг 4. Сервис отправки push:
Файл: src/lib/push/send-push.ts

```typescript
import webpush from 'web-push';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;           // куда вести при клике
  badge?: string;
  tag?: string;           // для дедупа на клиенте
  data?: Record<string, unknown>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
        },
        JSON.stringify(payload),
        {
          TTL: 60 * 60 * 24,  // 24 часа
          urgency: 'normal',
        }
      );

      await db.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });

      sent++;
    } catch (error: any) {
      // 410 Gone / 404 Not Found — подписка устарела, удаляем
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.pushSubscription.delete({ where: { id: sub.id } });
        removed++;
        logger.info({ userId, subId: sub.id }, 'Push subscription expired, removed');
      } else {
        logger.error({ err: error, userId, subId: sub.id }, 'Push send failed');
      }
    }
  }

  return { sent, removed };
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}
```

Шаг 5. API-роуты подписки:

/api/push/subscribe (POST):
```typescript
// src/app/api/push/subscribe/route.ts
import { z } from 'zod';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { db } from '@/lib/db';

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation error', 400);

    // Upsert: если уже есть подписка с этим endpoint — обновим
    const sub = await db.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: session.user.id,
        endpoint: parsed.data.endpoint,
        p256dhKey: parsed.data.keys.p256dh,
        authKey: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent,
      },
      update: {
        userId: session.user.id,  // если устройство передалось другому юзеру
        p256dhKey: parsed.data.keys.p256dh,
        authKey: parsed.data.keys.auth,
        lastUsedAt: new Date(),
      },
    });

    return successResponse({ id: sub.id });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse('Internal error', 500);
  }
}
```

/api/push/unsubscribe (POST):
```typescript
// body: { endpoint: string }
// Удалить запись
```

Проверка:
- VAPID keys в .env
- Prisma модель создана, миграция применена
- npx tsc --noEmit зелёный
````

---

## Шаг 4.2 — Клиентская подписка (День 2)

````
📋 ЗАДАЧА: Подписка браузера на push

Файл: src/lib/push/client.ts

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      userAgent: navigator.userAgent,
    }),
  });

  return res.ok;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return true;

  // Отписываемся локально
  await subscription.unsubscribe();

  // Удаляем из БД
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  return true;
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return sub !== null;
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}
```

Файл: src/components/pwa/PushSubscriptionPrompt.tsx

Не показывать промпт сразу — дождаться намеренного действия пользователя.
Обычно в настройках: «Включить уведомления».

Файл: src/app/(dashboard)/settings/notifications/page.tsx
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  isPushSupported,
} from '@/lib/push/client';

export default function NotificationSettingsPage() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    isPushSubscribed().then(setSubscribed);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      const ok = await subscribeToPush();
      setSubscribed(ok);
    } else {
      await unsubscribeFromPush();
      setSubscribed(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Уведомления</h1>

      {!supported && (
        <div className="p-4 bg-muted rounded">
          Ваш браузер не поддерживает push-уведомления.
          Попробуйте Chrome или Edge на Android.
        </div>
      )}

      {supported && (
        <div className="flex items-center justify-between p-4 border rounded">
          <div>
            <div className="font-medium">Push-уведомления на этом устройстве</div>
            <div className="text-sm text-muted-foreground">
              Новые замечания, согласования, приближение дедлайнов
            </div>
          </div>
          <Switch checked={subscribed} onCheckedChange={handleToggle} />
        </div>
      )}
    </div>
  );
}
```

Контекстный промпт (после события, когда push явно полезен):
— например, после создания первой записи в журнале появляется toast
«Включить уведомления о замечаниях к вашим записям?» [Включить] [Нет]

Проверка:
- /settings/notifications → тумблер работает
- После subscribe → /api/push/subscribe сохранил запись в БД
- После unsubscribe → запись удалена
- Permission denied — показан disabled state с объяснением
````

---

## Шаг 4.3 — Service Worker обработчик push (День 3)

````
📋 ЗАДАЧА: Добавить обработку push в src/sw/index.ts

Заменить заглушки push/notificationclick на реальные:

```typescript
// В src/sw/index.ts, после new Serwist(...)

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: any = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'StroyDocs', body: event.data.text() };
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: payload.badge ?? '/icons/badge-72.png',
    tag: payload.tag,             // заменяет одноимённые уведомления
    renotify: !!payload.tag,
    requireInteraction: payload.urgent === true,
    data: {
      url: payload.url,
      ...payload.data,
    },
    actions: payload.actions,     // ["Открыть", "Отклонить"]
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Если приложение уже открыто — переходим к целевому URL и фокусим
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          if ('focus' in client) await (client as WindowClient).focus();
          if ('navigate' in client) {
            await (client as WindowClient).navigate(targetUrl).catch(() => {});
          }
          return;
        }
      }

      // Иначе открываем новое окно
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Подписка истекла (редкий event, но нужно обработать)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const VAPID = '<SAME_PUBLIC_KEY>';  // из env — в Service Worker недоступны env,
                                           // зашить в build-time через serwist constants
      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: newSub.endpoint,
          keys: newSub.toJSON().keys,
        }),
      });
    })()
  );
});
```

ТРЮК с VAPID в SW: env-переменные недоступны в worker. Можно встроить
через webpack define plugin или через fetch /api/push/vapid-public-key при
pushsubscriptionchange.

Проверка:
- В DevTools → Application → Service Workers → Push:
  "{\"title\":\"Test\",\"body\":\"Hello\",\"url\":\"/dashboard\"}"
  → появляется native notification
- Click → открывает /dashboard
- Если вкладка уже открыта — она получает фокус и переходит на URL
````

---

## Шаг 4.4 — Интеграция с существующими Notification событиями (День 4–5)

````
📋 ЗАДАЧА: Отправлять push там, где создаются Notification в БД

В проекте уже есть BullMQ worker notification.worker.ts и функция
enqueueNotification (для email). Добавим отправку push параллельно email.

Файл: src/lib/push/notification-adapter.ts
```typescript
import type { Notification } from '@prisma/client';
import { sendPushToUser, type PushPayload } from './send-push';

interface PushConfig {
  title: (n: Notification) => string;
  body: (n: Notification) => string;
  url: (n: Notification) => string;
  urgent?: boolean;
}

// Маппинг notification.type → конфиг push
const PUSH_CONFIGS: Record<string, PushConfig> = {
  approval_required: {
    title: (n) => `Требуется ваше согласование: ${n.entityName ?? ''}`,
    body: (n) => n.body ?? '',
    url: (n) => '/inbox',
    urgent: true,
  },
  approval_approved: {
    title: (n) => `Согласовано: ${n.entityName ?? ''}`,
    body: (n) => n.body ?? '',
    url: (n) => `/objects/${n.entityId}`,
  },
  approval_rejected: {
    title: (n) => `Отклонено: ${n.entityName ?? ''}`,
    body: (n) => n.body ?? '',
    url: (n) => `/objects/${n.entityId}`,
    urgent: true,
  },
  prescription_deadline: {
    title: (n) => n.title,
    body: (n) => n.body ?? '',
    url: (n) => `/objects/${n.entityId}/sk`,
    urgent: true,
  },
  inspection_reminder: {
    title: (n) => n.title,
    body: (n) => n.body ?? '',
    url: (n) => `/objects/${n.entityId}/journals`,
  },
  remark_assigned: {
    title: (n) => `Новое замечание: ${n.entityName ?? ''}`,
    body: (n) => n.body ?? '',
    url: (n) => `/objects/${n.entityId}`,
    urgent: true,
  },
  // ... добавлять по мере появления типов
};

export async function sendPushForNotification(notification: Notification) {
  const config = PUSH_CONFIGS[notification.type];
  if (!config) return;  // нет push-конфига для этого типа — пропускаем

  const payload: PushPayload = {
    title: config.title(notification),
    body: config.body(notification),
    url: config.url(notification),
    tag: `${notification.type}:${notification.entityId ?? ''}`,  // для дедупа
    data: { notificationId: notification.id },
  };

  try {
    await sendPushToUser(notification.userId, payload);
  } catch (error) {
    // не прерываем процесс — push best-effort
  }
}
```

В src/lib/workers/notification.worker.ts (или где создаются Notification):
```typescript
import { sendPushForNotification } from '@/lib/push/notification-adapter';

// ... после создания notification в БД
await db.notification.create({ data: { ... } });

// Параллельно — push
sendPushForNotification(createdNotification).catch(() => {});  // fire-and-forget
```

Вариант Б (централизованный): BullMQ job `send-push` с параметром notificationId.
Запускается из того же места где enqueueNotification для email. Разделяет
responsibilities: email и push обрабатываются независимо.

Проверка:
- Прогнать existing flow (например, отправить документ на согласование)
- Убедиться что у ответственного пользователя пришёл push
- Click по push открывает /inbox с этим документом
````

---

# ФАЗА 5 — Камера, GPS, геозоны (1 неделя) ⬜

## Шаг 5.1 — CameraCapture с GPS (День 1–2)

````
📋 ЗАДАЧА: Компонент съёмки фото с автосохранением offline

Файл: src/components/mobile/CameraCapture.tsx

```tsx
'use client';

import { useState, useRef } from 'react';
import { Camera, MapPin, RotateCw, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';
import { photosRepo } from '@/lib/idb/repos/photos-repo';

interface GpsCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Props {
  entityType: 'JOURNAL_ENTRY' | 'DEFECT' | 'WORK_RECORD' | string;
  entityId?: string;
  entityClientId?: string;  // для offline-сущностей
  category?: 'CONFIRMING' | 'VIOLATION';
  onCaptured?: (clientId: string) => void;
}

export function CameraCapture({
  entityType,
  entityId,
  entityClientId,
  category,
  onCaptured,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsCoords | null>(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const requestGps = () => {
    if (!('geolocation' in navigator)) return;
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGettingGps(false);
      },
      (err) => {
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Сжимаем
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
    });

    setBlob(compressed);
    setPreview(URL.createObjectURL(compressed));

    // Запрашиваем GPS параллельно
    requestGps();
  };

  const handleSave = async () => {
    if (!blob) return;

    const clientId = uuidv4();

    await photosRepo.create({
      clientId,
      blob,
      fileName: `photo-${Date.now()}.jpg`,
      mimeType: blob.type,
      size: blob.size,
      entityType,
      entityServerId: entityId,
      entityClientId: entityClientId,
      gpsLat: gps?.lat,
      gpsLng: gps?.lng,
      takenAt: Date.now(),
      category,
      syncStatus: 'pending',
      uploadProgress: 0,
      createdAt: Date.now(),
    });

    onCaptured?.(clientId);
    setPreview(null);
    setBlob(null);
    setGps(null);
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <label className="relative block aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer active:bg-muted">
          <Camera className="w-12 h-12 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Сделать фото</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"  // задняя камера
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
            <img src={preview} className="w-full h-full object-contain" />
            {gps && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                <span className="opacity-60">±{Math.round(gps.accuracy)}м</span>
              </div>
            )}
            {gettingGps && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                Определяем координаты…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 py-3 rounded-md border"
              onClick={() => {
                setPreview(null);
                setBlob(null);
              }}
            >
              <RotateCw className="w-4 h-4 inline mr-1" /> Пересъёмка
            </button>
            <button
              className="flex-1 py-3 rounded-md bg-primary text-white"
              onClick={handleSave}
            >
              <Check className="w-4 h-4 inline mr-1" /> Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Проверка:
- Открыть на мобильном: input с capture=environment открывает камеру
- После съёмки — запрашивает GPS
- Сохранение — запись в IDB с blob
- В sync-queue попадает задача (через useOfflineMutation)
- Фото синхронизируется при онлайне
````

---

## Шаг 5.2 — Геозоны (геофенсинг) для подписания (День 3–4)

````
📋 ЗАДАЧА: Проверка «был ли на объекте» при подписании АОСР

Use case: при подписании АОСР на объекте мы сохраняем GPS пользователя.
Позже аудитор может увидеть — был ли ИТР физически на объекте?

В BuildingObject (Модуль 2) уже есть latitude/longitude.
Добавим проверку расстояния при подписании.

Prisma — расширить Signature:
```prisma
model Signature {
  // ... существующие поля
  gpsLat      Float?
  gpsLng      Float?
  gpsAccuracy Float?
  signedAtLocation Json?  // { objectId, distance, isWithinGeofence }
}
```

Миграция: add_signature_geolocation

Файл: src/lib/geofencing/distance.ts
```typescript
/// Haversine formula — расстояние между двумя GPS-точками в метрах
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;  // метры
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceCheckResult {
  distance: number;              // расстояние в метрах
  isWithin: boolean;             // true если в пределах radius
  radius: number;
}

const DEFAULT_RADIUS = 300;       // 300 м — объект строительства

export function checkGeofence(
  userLat: number, userLng: number,
  objectLat: number, objectLng: number,
  radius = DEFAULT_RADIUS
): GeofenceCheckResult {
  const distance = haversineDistance(userLat, userLng, objectLat, objectLng);
  return {
    distance,
    isWithin: distance <= radius,
    radius,
  };
}
```

Файл: src/components/mobile/SignWithGps.tsx
```tsx
'use client';

import { useState } from 'react';
import { checkGeofence } from '@/lib/geofencing/distance';
import { MapPin, AlertTriangle } from 'lucide-react';

interface Props {
  objectLat: number;
  objectLng: number;
  objectName: string;
  onSign: (gps: { lat: number; lng: number; accuracy: number }) => Promise<void>;
}

export function SignWithGps({ objectLat, objectLng, objectName, onSign }: Props) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'checking' | 'signing'>('idle');
  const [result, setResult] = useState<ReturnType<typeof checkGeofence> | null>(null);
  const [gps, setGps] = useState<GeolocationCoordinates | null>(null);

  const handleClick = async () => {
    setStatus('locating');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGps(pos.coords);
        setStatus('checking');

        const check = checkGeofence(
          pos.coords.latitude, pos.coords.longitude,
          objectLat, objectLng
        );
        setResult(check);

        if (!check.isWithin) {
          setStatus('idle');
          // Не блокируем (юрист может потребовать), но показываем warning
          return;
        }

        setStatus('signing');
        await onSign({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('idle');
      },
      (err) => {
        setStatus('idle');
        alert('Не удалось определить координаты. Проверьте разрешение геолокации.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-3">
      {result && !result.isWithin && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">Вы вне объекта «{objectName}»</div>
            <div className="text-sm">
              Расстояние до объекта: {Math.round(result.distance)} м
              (допустимо до {result.radius} м).
              Подписание возможно, но это будет отмечено в аудит-логе.
            </div>
          </div>
        </div>
      )}

      {result && result.isWithin && (
        <div className="p-3 rounded bg-green-50 border border-green-200 text-green-900 flex gap-2">
          <MapPin className="w-5 h-5 shrink-0" />
          <div>Вы на объекте «{objectName}» (±{Math.round(result.distance)} м)</div>
        </div>
      )}

      <button
        className="w-full py-3 rounded-md bg-primary text-white disabled:opacity-50"
        onClick={handleClick}
        disabled={status !== 'idle'}
      >
        {status === 'idle' && 'Подписать с GPS'}
        {status === 'locating' && 'Определяем координаты...'}
        {status === 'checking' && 'Проверяем местоположение...'}
        {status === 'signing' && 'Подписываем...'}
      </button>
    </div>
  );
}
```

API-роут подписания — принимает и сохраняет gps:
```typescript
// POST /api/execution-docs/[id]/sign
// body: { gpsLat, gpsLng, gpsAccuracy }

// Внутри:
const object = await db.buildingObject.findUnique({
  where: { id: doc.buildingObjectId },
  select: { latitude: true, longitude: true }
});

const check = object?.latitude && object?.longitude
  ? checkGeofence(body.gpsLat, body.gpsLng, object.latitude, object.longitude)
  : null;

await db.signature.create({
  data: {
    // ... существующие поля
    gpsLat: body.gpsLat,
    gpsLng: body.gpsLng,
    gpsAccuracy: body.gpsAccuracy,
    signedAtLocation: check ? {
      objectId: doc.buildingObjectId,
      distance: check.distance,
      isWithinGeofence: check.isWithin,
    } : null,
  }
});
```

Проверка:
- На объекте (или подделать GPS через DevTools → Sensors) — зелёный баннер
- Вне объекта — желтый warning, но подписание не блокируется
- В БД в Signature.signedAtLocation — записан результат проверки
````

---

## Шаг 5.3 — Голосовой ввод (Yandex SpeechKit) (День 5)

````
📋 ЗАДАЧА: Voice-to-text для записей журнала

Используем Yandex SpeechKit v3 (сервера РФ, ФЗ-152).
Альтернатива — Web Speech API (бесплатно, но только online и качество хуже).

Реализуем оба: Web Speech API как дефолт, Yandex SpeechKit для Pro.

Вариант A — Web Speech API (бесплатно, online-only):

Файл: src/components/mobile/VoiceInput.tsx
```tsx
'use client';

import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

interface Props {
  onTranscript: (text: string) => void;
}

export function VoiceInput({ onTranscript }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Голосовой ввод не поддерживается в этом браузере');
      return;
    }

    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`p-3 rounded-full ${listening ? 'bg-red-500' : 'bg-primary'} text-white`}
    >
      {listening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
```

Вариант B — Yandex SpeechKit (Pro в Модуле 15, лучше качество, offline audio запись):

Файл: src/lib/voice/yandex-speechkit.ts
```typescript
export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', blob);

  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Transcription failed');
  const { text } = await res.json();
  return text;
}
```

Серверный роут:
```typescript
// src/app/api/voice/transcribe/route.ts
import { requireFeature } from '@/lib/subscriptions/require-feature';  // из М15

export async function POST(req: Request) {
  const session = await getSessionOrThrow();
  await requireFeature(session.user.activeWorkspaceId, 'voice_input');

  const formData = await req.formData();
  const audio = formData.get('audio') as Blob;

  // Отправляем в Yandex SpeechKit v3 (REST)
  const yaRes = await fetch(
    'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize' +
    `?folderId=${env.YANDEX_FOLDER_ID}&lang=ru-RU`,
    {
      method: 'POST',
      headers: { Authorization: `Api-Key ${env.YANDEX_SPEECHKIT_API_KEY}` },
      body: audio,
    }
  );
  const { result } = await yaRes.json();

  return Response.json({ text: result });
}
```

env:
YANDEX_SPEECHKIT_API_KEY=
YANDEX_FOLDER_ID=

Интеграция в форму журнала:
```tsx
<div className="relative">
  <textarea ... />
  <VoiceInput
    onTranscript={(text) => setValue('description', getValues('description') + ' ' + text)}
    className="absolute bottom-2 right-2"
  />
</div>
```

Проверка:
- Web Speech API работает в Chrome Android (onLine only)
- Yandex SpeechKit fallback для Pro пользователей
- Текст вставляется в поле
````

---

# ФАЗА 6 — Mobile-first shell и полировка (1 неделя) ⬜

## Шаг 6.1 — Детектор мобильного и MobileShell (День 1–2)

````
📋 ЗАДАЧА: Отдельный мобильный лейаут для определённых маршрутов

Подход: URL-based. Полный desktop UI под /, специальный mobile shell под /mobile/*.
Пользователь может переключаться через кнопку «Мобильная версия».

Файл: src/app/mobile/layout.tsx
```tsx
import { MobileShell } from '@/components/mobile/MobileShell';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
```

Файл: src/components/mobile/MobileShell.tsx
```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Camera, AlertTriangle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/mobile/journal', label: 'Журнал', icon: BookOpen },
  { href: '/mobile/photo', label: 'Фото', icon: Camera },
  { href: '/mobile/defect', label: 'Дефект', icon: AlertTriangle },
  { href: '/mobile/profile', label: 'Профиль', icon: User },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col h-dvh">
      {/* Контент с отступом под нижний tab-bar */}
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t bg-background flex items-stretch z-30">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

Далее страницы:
- src/app/mobile/page.tsx (главный экран, список объектов)
- src/app/mobile/journal/page.tsx (список журналов пользователя)
- src/app/mobile/journal/[journalId]/new/page.tsx (создание записи)
- src/app/mobile/photo/page.tsx (съёмка фото)
- src/app/mobile/defect/page.tsx (фиксация дефекта)
- src/app/mobile/profile/page.tsx (профиль + настройки + оффлайн-очередь)

Shortcuts из манифеста (Фаза 1.3) уже ведут на эти URL.

Автоматический редирект на /mobile при первом входе с телефона — опционально:
в src/app/page.tsx сделать detection + redirect.

Проверка:
- На iPhone — /mobile/journal работает как нативка после установки
- Bottom tab активен, навигация без перезагрузки
- Safe area insets на iPhone X+ учтены (env(safe-area-inset-bottom))
````

---

## Шаг 6.2 — Быстрые формы для 3 главных действий (День 3–4)

````
📋 ЗАДАЧА: Максимально простые формы для прораба

Принцип: максимум 3-4 поля, крупные кнопки, умолчания (дата = сегодня,
автор = текущий пользователь), сохранение работает и офлайн.

Файл: src/app/mobile/journal/[journalId]/new/page.tsx
```tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/mobile/CameraCapture';
import { VoiceInput } from '@/components/mobile/VoiceInput';
import { useCreateJournalEntry } from '@/hooks/use-create-journal-entry';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function NewJournalEntryPage() {
  const { journalId } = useParams<{ journalId: string }>();
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [photoClientIds, setPhotoClientIds] = useState<string[]>([]);

  const createMutation = useCreateJournalEntry();

  const handleSave = async () => {
    await createMutation.mutateAsync({
      journalId,
      projectId: /* из контекста */ '',
      date: new Date().toISOString(),
      description,
      data: {},
    });
    router.push(`/mobile/journal/${journalId}`);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Новая запись</h1>

      <div className="relative">
        <Textarea
          placeholder="Что сделали сегодня?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="pr-14"
        />
        <div className="absolute bottom-2 right-2">
          <VoiceInput onTranscript={(t) => setDescription((d) => d + ' ' + t)} />
        </div>
      </div>

      <CameraCapture
        entityType="JOURNAL_ENTRY"
        onCaptured={(cid) => setPhotoClientIds((ids) => [...ids, cid])}
      />

      {photoClientIds.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Прикреплено фото: {photoClientIds.length}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={!description || createMutation.isPending}
        className="w-full h-12 text-base"
      >
        Сохранить запись
      </Button>
    </div>
  );
}
```

Аналогично создать:
- src/app/mobile/photo/page.tsx — camera → выбор сущности
- src/app/mobile/defect/page.tsx — описание + фото + категория + сохранить

Проверка:
- Длительность действия «добавить запись в ОЖР» < 30 секунд
- Работает offline (запись в IDB, sync через очередь)
- Визуально оптимизирован под одну руку (кнопки в нижней трети экрана)
````

---

## Шаг 6.3 — Тестирование и Lighthouse CI (День 5)

````
📋 ЗАДАЧА: Автоматизированное тестирование PWA

Шаг 1. Lighthouse в CI:
Файл: .github/workflows/pwa-audit.yml (или аналог Timeweb CI)

```yaml
name: PWA Audit
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: sleep 10
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/mobile
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: '.lighthouserc.json'
```

Файл: .lighthouserc.json
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 1
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "installable-manifest": "error",
        "service-worker": "error",
        "splash-screen": "warn",
        "themed-omnibox": "warn",
        "viewport": "error",
        "maskable-icon": "warn",
        "offline-start-url": "warn",
        "categories:performance": ["warn", { "minScore": 0.7 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:pwa": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

Шаг 2. Playwright для E2E оффлайн-сценариев:
Файл: tests/e2e/offline.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('Offline mode', () => {
  test('should save journal entry offline and sync on reconnect', async ({ page, context }) => {
    await page.goto('/mobile/journal');
    await expect(page.locator('h1')).toBeVisible();

    // Переключаем в offline
    await context.setOffline(true);

    await page.getByText('Новая запись').click();
    await page.getByPlaceholder('Что сделали').fill('Залили фундамент 50 м3');
    await page.getByText('Сохранить запись').click();

    // Проверяем, что баннер оффлайн показан
    await expect(page.getByText('Нет подключения')).toBeVisible();

    // Запись должна отобразиться в списке даже офлайн
    await expect(page.getByText('Залили фундамент')).toBeVisible();

    // Возвращаем online
    await context.setOffline(false);

    // Ждем синхронизацию (максимум 10 сек)
    await expect(page.getByText('Ожидают синхронизации')).toBeHidden({ timeout: 10000 });
  });

  test('should cache main pages for offline browsing', async ({ page, context }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page.reload();

    // Страница должна открыться из кэша
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should show /~offline fallback for uncached routes', async ({ page, context }) => {
    await page.goto('/dashboard');
    await context.setOffline(true);

    await page.goto('/some/uncached/route');
    await expect(page.getByText('Нет подключения')).toBeVisible();
  });
});
```

Шаг 3. Manual test checklist:
Создать docs/pwa-test-checklist.md:
- [ ] Install prompt на Android
- [ ] «На экран Домой» на iOS
- [ ] Иконки отображаются в 192/512/maskable
- [ ] Splash screen (iOS)
- [ ] Shortcuts при долгом нажатии на иконку (Android 8+)
- [ ] Offline: навигация по кэшированным страницам
- [ ] Offline: создание записи ОЖР, попадает в sync-queue
- [ ] Online: sync-queue автоматически разгребается
- [ ] Push: permission prompt работает
- [ ] Push: получение уведомления, click открывает нужный URL
- [ ] Камера: съёмка + GPS + сжатие + сохранение офлайн
- [ ] Геозоны: подписание в объекте vs вне
- [ ] Голосовой ввод: ru-RU, корректное распознавание

Проверка:
- Lighthouse PWA score ≥ 90
- Все E2E-тесты проходят
- Manual checklist заполнен
````

---

# Критичные best practices (обязательно прочитать)

## Безопасность
1. **Все push-endpoints — под HTTPS** (иначе не работают ни service worker, ни push)
2. **VAPID private key — только на сервере**. Никогда в client bundle
3. **IndexedDB не шифруется**. Не хранить там пароли/токены/чувствительные PII
4. **При logout — чистить IDB**:
   ```typescript
   export async function clearOfflineData() {
     const db = await getDB();
     await db.clear('sync-queue');
     await db.clear('offline-journal-entries');
     await db.clear('offline-photos');
     await db.clear('cache-snapshots');
   }
   ```
   Вызывать из `signOut` callback NextAuth

## iOS-специфичные ограничения
- **Push работает только в установленном PWA** (iOS 16.4+). В Safari-вкладке не работает
- **Background Sync не поддерживается** — работает только immediate sync при online event
- **Storage quota: 1 GB** (против ~50 GB на Chrome Android). Важно для фото
- **"standalone" mode не даёт доступ к Push API до установки на home screen**

## Миграции IndexedDB
- При bumps `DB_VERSION` нужна `upgrade` функция с миграцией данных
- Старые версии схемы должны оставаться обратно-совместимыми на время переходного периода
- Никогда не удалять старые stores/indexes без backup

## Performance
- **Bundling service worker**: Serwist делает это автоматически, но любые импорты из `node_modules` попадают в SW bundle. Держать `src/sw/index.ts` минимальным
- **IndexedDB транзакции**: `tx.done` обязателен для await, иначе race conditions
- **Квота storage**: мониторить через `navigator.storage.estimate()` и показывать предупреждение при > 80%

## Обновления PWA
- `skipWaiting: true` — новая версия активируется сразу. Рискованно для долгих сессий с локальным state
- Альтернатива: показывать toast «Доступна новая версия → [Обновить]» и делать skipWaiting по клику

## ФЗ-152
- Push-сервисы браузеров (Google FCM, Mozilla Push, Apple APNs) передают endpoint, но **не содержимое** — оно шифруется VAPID'ом
- Все пользовательские данные хранятся на Timeweb (РФ)
- VAPID subject = ваш рабочий email (admin@stroydocs.ru)

---

# Итоговые метрики готовности

| Фаза | Критерий завершения |
|------|---------------------|
| 1 | Lighthouse PWA audit ≥ 90, manifest валиден, SW активен |
| 2 | Все 4 IDB-стора созданы, репозитории покрыты тестами |
| 3 | Offline-мутация работает, sync-queue разгребается автоматически |
| 4 | Push приходит на Android за < 5 сек, click открывает нужный URL |
| 5 | Фото с GPS сохраняется офлайн, геозона работает |
| 6 | E2E Playwright тесты зелёные, manual checklist выполнен |

---

# База данных (новые модели Модуля 16)

**Новые:**
- `PushSubscription` (userId, endpoint, p256dhKey, authKey, userAgent, deviceLabel)

**Расширения:**
- `Signature` + `gpsLat`, `gpsLng`, `gpsAccuracy`, `signedAtLocation Json?`

**IndexedDB (клиентская, не в Prisma):**
- `sync-queue` — очередь API-запросов
- `offline-journal-entries` — оффлайн-записи журналов
- `offline-photos` — оффлайн-фото с blob
- `cache-snapshots` — кэш ответов API

---

# После Модуля 16 — что меняется в Модуле 15

Ранее в плане Модуля 15 Фаза 7 (Прораб-Журнал) содержала частично-PWA логику.
После готового Модуля 16 она становится тонким mobile-first UI-слоем:

| Было в плане 15 Фазы 7 | После 16 |
|-------------------------|----------|
| Service Worker setup | ✅ из М16 |
| IndexedDB-очередь | ✅ из М16 |
| Background Sync API | ✅ из М16 |
| Офлайн-режим | ✅ из М16 |
| Mobile UI компоненты | ⬜ делаем в М15 Фазе 7 |
| Feature-gate по подписке | ⬜ делаем в М15 |
| Голосовой ввод Pro | ⬜ в М16 реализован, gate через М15 |
| Геозоны | ✅ из М16 |
| Виральность Прораб→ПТО | ⬜ делаем в М15 |

Это правильный порядок: **инфраструктура (16) → монетизация (15)**.

---

_Конец Модуля 16._
_Готов к передаче в разработку Claude Code по фазам. Рекомендуемый порядок: 1 → 2 → 3, затем параллельно 4 и 5, затем 6._
