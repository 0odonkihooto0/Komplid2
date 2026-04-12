'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const ESTIMATES_TABS: { label: string; href: string; badge?: string }[] = [
  { label: 'Сметы', href: '' },
  { label: 'Сравнение смет', href: 'compare' },
  { label: 'Ведомости выполненных работ', href: 'worksheets', badge: 'В разработке' },
  { label: 'Позиции ведомостей', href: 'worksheet-items', badge: 'В разработке' },
];

export default function EstimatesLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Определяем активную вкладку по пути
  const active =
    ESTIMATES_TABS.filter((t) => t.href !== '')
      .find((t) => pathname.includes(`/estimates/${t.href}`))?.href ?? '';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) => {
          const path = val
            ? `/objects/${params.objectId}/estimates/${val}`
            : `/objects/${params.objectId}/estimates`;
          router.push(path);
        }}
      >
        <TabsList className="flex-wrap">
          {ESTIMATES_TABS.map((t) => (
            <TabsTrigger key={t.href} value={t.href}>
              {t.label}
              {t.badge && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] font-normal">
                  {t.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
