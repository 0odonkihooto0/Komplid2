import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import GuestHeader from '@/components/guest/GuestHeader';

export const dynamic = 'force-dynamic';

// Лейаут для гостевого кабинета — без sidebar, только шапка
export default async function GuestLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // Неавторизованный пользователь → на логин
  if (!session) redirect('/login');

  // Пользователь с обычной ролью → в основное приложение
  if (session.user.activeRole !== 'GUEST') redirect('/objects');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <GuestHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
