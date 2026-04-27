'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: '/profile', label: 'Общее', exact: true },
  { href: '/profile/security', label: 'Безопасность' },
  { href: '/profile/notifications', label: 'Уведомления' },
  { href: '/profile/integrations', label: 'Интеграции' },
  { href: '/profile/referrals', label: 'Рефералы' },
  { href: '/profile/delete', label: 'Удаление аккаунта' },
];

export function ProfileTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border pb-0">
      {TABS.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors -mb-px',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
