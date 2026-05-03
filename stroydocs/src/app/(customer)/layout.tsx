import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CustomerHeader from '@/components/customer/CustomerHeader';

export const dynamic = 'force-dynamic';

// Лейаут для кабинета B2C-заказчика — без sidebar, только шапка
export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // Неавторизованный пользователь → на логин
  if (!session) redirect('/login');

  // Пользователь не является B2C-заказчиком → в основное приложение
  if (session.user.planProfiRole !== 'CUSTOMER') redirect('/objects');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <CustomerHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
