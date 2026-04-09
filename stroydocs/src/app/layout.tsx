import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { Toaster } from '@/components/shared/Toaster';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'StroyDocs',
  description: 'B2B SaaS-платформа для автоматизации исполнительной документации в строительстве',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          <ErrorBoundary>
            {children}
            <Toaster />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
