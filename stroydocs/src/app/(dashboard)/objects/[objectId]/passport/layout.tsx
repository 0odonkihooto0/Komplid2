'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const PASSPORT_TABS = [
  { label: 'Задачи',                href: 'tasks' },
  { label: 'Строительный контроль', href: 'sk' },
  { label: 'Проблемные вопросы',    href: 'problems' },
  { label: 'Фотогалерея',           href: 'photos' },
];

export default function PassportLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Активная вкладка определяется по URL; на корневом /passport — ни одна не активна
  const activeTab =
    PASSPORT_TABS.find((t) => pathname.includes(`/passport/${t.href}`))?.href ?? '';

  const isSubRoute = PASSPORT_TABS.some((t) => pathname.includes(`/passport/${t.href}`));

  return (
    <div className="space-y-4">
      {/* Основной контент паспорта всегда виден на корневом /passport */}
      {!isSubRoute && children}

      {/* Навигационные вкладки */}
      <Tabs
        value={activeTab}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/passport/${val}`)
        }
      >
        <TabsList>
          {PASSPORT_TABS.map((t) => (
            <TabsTrigger key={t.href} value={t.href}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Контент вкладки (только при наличии суб-роута) */}
      {isSubRoute && children}
    </div>
  );
}
