'use client';

import { signOut, useSession } from 'next-auth/react';
import { Hammer, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Шапка кабинета B2C-заказчика «Мой Ремонт» — без workspace
export default function CustomerHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  // Инициалы пользователя для аватара
  const initials = user
    ? `${(user.lastName ?? '')[0] ?? ''}${(user.firstName ?? '')[0] ?? ''}`
    : '';

  const fullName = user
    ? `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim()
    : '';

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white dark:bg-slate-900 px-4 sm:px-6 shadow-sm">
      {/* Логотип и название продукта */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Hammer className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Мой Ремонт
        </span>
      </div>

      {/* Навигационные ссылки */}
      <nav className="hidden sm:flex items-center gap-1 ml-4">
        <Link
          href="/moy-remont"
          className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Проекты
        </Link>
        <Link
          href="/moy-remont/ai-lawyer"
          className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          AI-юрист
        </Link>
      </nav>

      <div className="flex-1" />

      {/* Правая часть: аватар, имя, выход */}
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {fullName}
            </span>
          </div>
        )}

        {/* Кнопка выхода из аккаунта */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Выйти</span>
        </Button>
      </div>
    </header>
  );
}
