'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const PIR_TABS = [
  { label: 'Задание на ПИР',  href: 'design-task' },
  { label: 'Изыскания',       href: 'survey-task' },
  { label: 'Документация',    href: 'documentation' },
  { label: 'Повторное прим.', href: 'reuse' },
  { label: 'Реестры',         href: 'registries' },
  { label: 'Закрытие',        href: 'closure' },
  { label: 'Аналитика',       href: 'analytics' },
];

export default function PIRLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    PIR_TABS.find((t) => pathname.includes(`/pir/${t.href}`))?.href ?? 'design-task';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/pir/${val}`)
        }
      >
        <TabsList>
          {PIR_TABS.map((t) => (
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
