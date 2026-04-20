'use client';

import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Camera, AlertTriangle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/mobile/journal', label: 'Журнал', icon: BookOpen },
  { href: '/mobile/photo', label: 'Фото', icon: Camera },
  { href: '/mobile/defect', label: 'Дефект', icon: AlertTriangle },
  { href: '/mobile/profile', label: 'Профиль', icon: User },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col h-dvh">
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 border-t bg-background flex items-stretch z-30"
        style={{ height: 'calc(4rem + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
