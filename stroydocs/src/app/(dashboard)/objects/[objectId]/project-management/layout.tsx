'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const PM_TABS = [
  { label: 'Планировщик',            href: 'planner' },
  { label: 'Версии УП',             href: 'versions' },
  { label: 'Аналитика (контракты)', href: 'analytics' },
];

export default function ProjectManagementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router   = useRouter();

  const active =
    PM_TABS.find((t) => pathname.includes(`/project-management/${t.href}`))?.href ?? 'planner';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/project-management/${val}`)
        }
      >
        <TabsList>
          {PM_TABS.map((t) => (
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
