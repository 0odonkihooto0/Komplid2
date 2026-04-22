import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { Toaster } from '@/components/shared/Toaster';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { InstallPromptAndroid } from '@/components/pwa/InstallPromptAndroid';
import { InstallPromptIos } from '@/components/pwa/InstallPromptIos';
import { NetworkListener } from '@/components/pwa/NetworkListener';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { BackOnlineToast } from '@/components/pwa/BackOnlineToast';
import { SyncTrigger } from '@/components/pwa/SyncTrigger';

// Локальные шрифты из public/fonts/ — скопированы из @fontsource через prebuild.
// Не требуют доступа к Google Fonts: работает в Docker без интернета (ФЗ-152).
const inter = localFont({
  src: [
    { path: '../../public/fonts/inter-latin-wght-normal.woff2',    weight: '100 900', style: 'normal' },
    { path: '../../public/fonts/inter-cyrillic-wght-normal.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: [
    { path: '../../public/fonts/jetbrains-mono-latin-400-normal.woff2',    weight: '400', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-cyrillic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-latin-700-normal.woff2',    weight: '700', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-cyrillic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StroyDocs',
  description: 'B2B SaaS-платформа для автоматизации исполнительной документации в строительстве',
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
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Инлайн-скрипт работает синхронно до первой отрисовки — защищает от FOUC
// при reload страницы с theme=dark в localStorage. Нельзя заменить на next/script
// с beforeInteractive: в App Router этот флаг выполняется уже после гидратации.
const preRenderThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('komplid-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    var accent = localStorage.getItem('komplid-accent');
    if (accent === 'cobalt' || accent === 'lime') {
      document.documentElement.setAttribute('data-accent', accent);
    } else if (accent === 'steel') {
      document.documentElement.removeAttribute('data-accent');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preRenderThemeScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <ErrorBoundary>
            {children}
            <Toaster />
            <NetworkListener />
            <SyncTrigger />
            <OfflineBanner />
            <BackOnlineToast />
            <InstallPromptAndroid />
            <InstallPromptIos />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
