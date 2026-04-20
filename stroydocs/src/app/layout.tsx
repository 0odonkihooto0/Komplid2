import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { Toaster } from '@/components/shared/Toaster';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { InstallPromptAndroid } from '@/components/pwa/InstallPromptAndroid';
import { InstallPromptIos } from '@/components/pwa/InstallPromptIos';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
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
            <InstallPromptAndroid />
            <InstallPromptIos />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
