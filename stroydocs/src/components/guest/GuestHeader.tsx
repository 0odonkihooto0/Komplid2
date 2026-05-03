'use client';

import { signOut, useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationsDropdown } from '@/components/shared/NotificationsDropdown';

interface GuestMe {
  workspaceName: string;
  user: { firstName: string; lastName: string; email: string };
}

// Шапка гостевого кабинета — без sidebar, упрощённый дизайн
export default function GuestHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  // Получаем имя рабочего пространства из API гостя
  const { data: me } = useQuery<GuestMe>({
    queryKey: ['guest-me'],
    queryFn: async () => {
      const res = await fetch('/api/guest/me');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session,
  });

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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white dark:bg-gray-900 px-4 sm:px-6 shadow-sm">
      {/* Логотип и название рабочего пространства */}
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate block">
            {me?.workspaceName ?? 'StroyDocs'}
          </span>
          <span className="text-xs text-muted-foreground">Гостевой кабинет</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Правая часть шапки: уведомления, пользователь, выход */}
      <div className="flex items-center gap-2">
        <NotificationsDropdown />

        {/* Имя пользователя и аватар */}
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

        {/* Кнопка выхода */}
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
