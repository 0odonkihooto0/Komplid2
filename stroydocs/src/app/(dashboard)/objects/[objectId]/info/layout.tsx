'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { GlobalSearchBar } from '@/components/objects/info/GlobalSearchBar';

const INFO_TABS = [
  { label: 'Участники',     href: 'participants' },
  { label: 'Переписка',     href: 'correspondence' },
  { label: 'Вопросы (RFI)', href: 'rfi' },
  { label: 'Чат',           href: 'chat' },
];

export default function InfoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab =
    INFO_TABS.find((t) => pathname.includes(`/info/${t.href}`))?.href ?? 'participants';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            router.push(`/objects/${params.objectId}/info/${val}`)
          }
        >
          <TabsList>
            {INFO_TABS.map((t) => (
              <TabsTrigger key={t.href} value={t.href}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <GlobalSearchBar objectId={params.objectId} />
      </div>
      {children}
    </div>
  );
}
