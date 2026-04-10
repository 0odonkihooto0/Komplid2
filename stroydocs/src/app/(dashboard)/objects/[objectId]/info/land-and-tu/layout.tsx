'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SUBTABS = [
  { label: 'Земельные участки', href: 'land-plots' },
  { label: 'Технические условия', href: 'technical-conditions' },
];

export default function LandAndTuLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  const active =
    SUBTABS.find((t) => pathname.includes(`/land-and-tu/${t.href}`))?.href ?? 'land-plots';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/info/land-and-tu/${val}`)
        }
      >
        <TabsList>
          {SUBTABS.map((tab) => (
            <TabsTrigger key={tab.href} value={tab.href}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
