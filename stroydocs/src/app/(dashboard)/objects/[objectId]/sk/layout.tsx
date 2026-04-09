'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

// Вкладки модуля Строительный контроль (Модуль 11)
const SK_TABS = [
  { label: 'Проверки',                   href: 'inspections' },
  { label: 'Акты проверки',              href: 'inspection-acts' },
  { label: 'Предписания',                href: 'prescriptions' },
  { label: 'Недостатки',                 href: 'defects' },
  { label: 'Акты устранения недостатков', href: 'remediation-acts' },
  { label: 'Аналитика',                  href: 'analytics' },
  { label: 'ОТиТБ',                      href: 'safety-briefings' },
];

export default function SkLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    SK_TABS.find((t) => pathname.includes(`/sk/${t.href}`))?.href ?? 'inspections';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val: string) =>
          router.push(`/objects/${params.objectId}/sk/${val}`)
        }
      >
        <TabsList className="flex-wrap">
          {SK_TABS.map((t) => (
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
