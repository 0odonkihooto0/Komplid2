'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useObjectCounts, type ObjectCounts } from '@/hooks/useObjectCounts';
import { CountBadge } from '@/components/shared/CountBadge';

type InfoTabCountKey = keyof ObjectCounts['infoTabs'];

interface TabDef {
  label: string;
  href: string;
  countKey?: InfoTabCountKey;
}

const INFO_TABS: TabDef[] = [
  { label: 'Общие сведения',   href: 'general' },
  { label: 'Участники',        href: 'participants',  countKey: 'participants' },
  { label: 'Показатели',       href: 'indicators',    countKey: 'indicators' },
  { label: 'Финансирование',   href: 'funding' },
  { label: 'Лимиты и риски',   href: 'limit-risks',   countKey: 'limitsRisks' },
  { label: 'Земля и ТУ',       href: 'land-and-tu' },
  { label: 'Переписка',        href: 'correspondence', countKey: 'correspondence' },
  { label: 'Вопросы',          href: 'questions' },
  { label: 'Задачи',           href: 'tasks',          countKey: 'tasks' },
  { label: 'Фото',             href: 'photos' },
  { label: 'Видео',            href: 'video' },
  { label: 'Файлы',            href: 'files',          countKey: 'files' },
  { label: 'Чат',              href: 'chat' },
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
  const { data: counts } = useObjectCounts(params.objectId);

  const activeTab =
    INFO_TABS.find((t) => pathname.includes(`/info/${t.href}`))?.href ?? 'general';

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="flex border-b min-w-max">
          {INFO_TABS.map((tab) => {
            const count = tab.countKey ? counts?.infoTabs[tab.countKey] : undefined;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(`/objects/${params.objectId}/info/${tab.href}`)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px',
                  activeTab === tab.href
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {count != null && count > 0 && <CountBadge count={count} />}
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
