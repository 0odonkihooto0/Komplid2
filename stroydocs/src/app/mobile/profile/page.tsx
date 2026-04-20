'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncQueuePanel } from '@/components/pwa/SyncQueuePanel';

export default function MobileProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const user = session?.user;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-semibold">Профиль</h1>

      {user && (
        <div className="p-4 rounded-lg border bg-card space-y-1">
          <p className="font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      )}

      {/* Офлайн-очередь синхронизации */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Синхронизация</p>
        <SyncQueuePanel />
        <p className="text-xs text-muted-foreground">
          Записи, созданные офлайн, синхронизируются автоматически при подключении к сети.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/dashboard')}
        >
          <Monitor className="w-4 h-4 mr-2" />
          Полная версия
        </Button>

        <Button
          variant="outline"
          className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Выйти
        </Button>
      </div>
    </div>
  );
}
