'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const MGMT_TABS = [
  { label: 'Контракты',            href: 'contracts' },
  { label: 'Документы',            href: 'documents' },
  { label: 'Мероприятия',          href: 'events' },
  { label: 'Аналитика',            href: 'analytics' },
  { label: 'Перечень мероприятий', href: 'activities' },
];

export default function ManagementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    MGMT_TABS.find((t) => pathname.includes(`/management/${t.href}`))?.href ?? 'contracts';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/management/${val}`)
        }
      >
        <TabsList>
          {MGMT_TABS.map((t) => (
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
