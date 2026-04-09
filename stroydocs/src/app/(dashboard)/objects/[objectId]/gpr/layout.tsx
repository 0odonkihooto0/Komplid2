'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const GPR_TABS = [
  { label: 'Структура',     href: 'structure' },
  { label: 'График',        href: 'schedule' },
  { label: 'Аналитика',     href: 'analytics' },
  { label: 'Версии',        href: 'versions' },
  { label: 'Стадии',        href: 'stages' },
  { label: 'Суточный',      href: 'daily' },
  { label: 'План освоения', href: 'mastering' },
  { label: 'Сравнение',     href: 'compare' },
];

export default function GPRLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    GPR_TABS.find((t) => pathname.includes(`/gpr/${t.href}`))?.href ?? 'structure';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val: string) =>
          router.push(`/objects/${params.objectId}/gpr/${val}`)
        }
      >
        <TabsList>
          {GPR_TABS.map((t) => (
            <TabsTrigger key={t.href} value={t.href}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
