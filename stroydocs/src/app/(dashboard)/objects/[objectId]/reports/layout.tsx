'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const REPORTS_TABS = [
  { label: 'Отчёты',       href: 'list' },
  { label: 'Тематические', href: 'thematic' },
  { label: 'Шаблоны',      href: 'templates' },
];

export default function ReportsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    REPORTS_TABS.find((t) => pathname.includes(`/reports/${t.href}`))?.href ??
    'list';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/reports/${val}`)
        }
      >
        <TabsList>
          {REPORTS_TABS.map((t) => (
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
