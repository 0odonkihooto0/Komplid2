'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const JOURNAL_TABS = [
  { label: 'Реестр журналов', href: 'registry' },
  { label: 'ОЖР',            href: 'ozr' },
  { label: 'ЖВК',            href: 'jvk' },
];

export default function JournalsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    JOURNAL_TABS.find((t) => pathname.includes(`/journals/${t.href}`))?.href ??
    'registry';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/journals/${val}`)
        }
      >
        <TabsList>
          {JOURNAL_TABS.map((t) => (
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
