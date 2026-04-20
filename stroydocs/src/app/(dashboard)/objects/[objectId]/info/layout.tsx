'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const INFO_TABS = [
  { label: 'Общие сведения',   href: 'general' },
  { label: 'Участники',        href: 'participants' },
  { label: 'Показатели',       href: 'indicators' },
  { label: 'Финансирование',   href: 'funding' },
  { label: 'Лимиты и риски',   href: 'limit-risks' },
  { label: 'Земля и ТУ',       href: 'land-and-tu' },
  { label: 'Переписка',        href: 'correspondence' },
  { label: 'Вопросы',          href: 'questions' },
  { label: 'Задачи',           href: 'tasks' },
  { label: 'Фото',             href: 'photos' },
  { label: 'Видео',            href: 'video' },
  { label: 'Файлы',            href: 'files' },
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

  const activeTab =
    INFO_TABS.find((t) => pathname.includes(`/info/${t.href}`))?.href ?? 'general';

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="flex border-b min-w-max">
          {INFO_TABS.map((tab) => (
            <button
              key={tab.href}
              onClick={() => router.push(`/objects/${params.objectId}/info/${tab.href}`)}
              className={cn(
                'px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.href
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
