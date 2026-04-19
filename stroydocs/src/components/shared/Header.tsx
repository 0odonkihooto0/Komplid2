'use client';

import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationsDropdown } from './NotificationsDropdown';
import { TasksQuickPanel } from './TasksQuickPanel';
import { SearchTrigger } from './SearchTrigger';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const initials = user ? `${user.lastName[0]}${user.firstName[0]}` : '';

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      {/* Свободное пространство слева — оставлено под хлебные крошки при дальнейшем развитии */}
      <div className="flex-1" />
      <div className="flex flex-1 justify-center">
        <SearchTrigger />
      </div>
      <div className="flex flex-1 items-center justify-end gap-1">
        <ThemeToggle />
        <TasksQuickPanel />
        <NotificationsDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.lastName} {user.firstName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Профиль
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
