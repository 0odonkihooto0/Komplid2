'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const RESOURCES_TABS = [
  { label: 'Планирование',        href: 'planning' },
  { label: 'Заявки',              href: 'requests' },
  { label: 'Закупки и логистика', href: 'procurement' },
  { label: 'Склад',               href: 'warehouse' },
];

export default function ResourcesLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    RESOURCES_TABS.find((t) => pathname.includes(`/resources/${t.href}`))?.href ??
    'planning';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/resources/${val}`)
        }
      >
        <TabsList>
          {RESOURCES_TABS.map((t) => (
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
