'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS = [
  { label: 'Контракты',            href: 'contracts'  },
  { label: 'Документы',            href: 'documents'  },
  { label: 'Перечень мероприятий', href: 'activities' },
  { label: 'Управление проектом',  href: 'planner'    },
  { label: 'Версии УП',            href: 'versions'   },
  { label: 'Аналитика (контракты)',href: 'analytics'  },
  { label: 'Публичность',          href: 'publicity'  },
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
    TABS.find((t) => pathname.includes(`/project-management/${t.href}`))?.href ?? 'contracts';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/project-management/${val}`)
        }
      >
        <TabsList>
          {TABS.map((t) => (
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
