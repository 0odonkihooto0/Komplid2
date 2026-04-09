'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const ESTIMATES_TABS = [
  { label: 'Сметы',           href: 'list' },
  { label: 'Смета контракта', href: 'contract' },
  { label: 'Сравнение',       href: 'compare' },
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
  const active =
    ESTIMATES_TABS.find((t) => pathname.includes(`/estimates/${t.href}`))?.href ?? 'list';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/estimates/${val}`)
        }
      >
        <TabsList>
          {ESTIMATES_TABS.map((t) => (
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
