'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const TIM_TABS = [
  { label: 'Модели',            href: 'models' },
  { label: 'Замечания к ЦИМ',   href: 'issues' },
  { label: 'Настройки доступа', href: 'access' },
];

export default function TimLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    TIM_TABS.find((t) => pathname.includes(`/tim/${t.href}`))?.href ?? 'models';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/tim/${val}`)
        }
      >
        <TabsList>
          {TIM_TABS.map((t) => (
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
