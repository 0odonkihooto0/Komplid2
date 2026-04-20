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
    theme_color: '#2563EB',
    lang: 'ru',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
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
    screenshots: [
      {
        src: '/screenshots/mobile-journal.png',
        sizes: '540x1170',
        type: 'image/png',
        label: 'Журнал работ',
      },
      {
        src: '/screenshots/mobile-photo.png',
        sizes: '540x1170',
        type: 'image/png',
        label: 'Фото с GPS',
      },
      {
        src: '/screenshots/desktop-dashboard.png',
        sizes: '1920x1080',
        type: 'image/png',
        label: 'Дашборд',
      },
    ],
  };
}
