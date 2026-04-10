'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSearchBar } from '@/components/objects/info/GlobalSearchBar';

const INFO_TABS = [
  { label: 'Информация',               href: 'general' },
  { label: 'Показатели',               href: 'indicators' },
  { label: 'Участники',                href: 'participants' },
  { label: 'Файловое хранилище',       href: 'files' },
  { label: 'Финансирование',           href: 'funding' },
  { label: 'Риски неосвоения лимитов', href: 'limit-risks' },
  { label: 'Земельные участки и ТУ',   href: 'land-and-tu' },
  { label: 'Фотогалерея',              href: 'photos' },
  { label: 'Видеонаблюдение',          href: 'video' },
  { label: 'Вопросы',                  href: 'questions' },
  { label: 'Задачи',                   href: 'tasks' },
  { label: 'Деловая переписка',        href: 'correspondence' },
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
  const [menuOpen, setMenuOpen] = useState(false);

  const activeTab =
    INFO_TABS.find((t) => pathname.includes(`/info/${t.href}`))?.href ?? 'general';

  function navigate(href: string) {
    router.push(`/objects/${params.objectId}/info/${href}`);
    setMenuOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {/* Скроллируемая полоса вкладок */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex border-b min-w-max">
            {INFO_TABS.map((tab) => (
              <button
                key={tab.href}
                onClick={() => navigate(tab.href)}
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

        {/* Кнопка раскрытия полного списка вкладок */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Показать все вкладки"
            className={cn(
              'flex items-center justify-center rounded-md border p-1.5 transition-colors',
              menuOpen
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <>
              {/* Закрытие по клику вне меню */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-background shadow-lg py-1">
                {INFO_TABS.map((tab) => (
                  <button
                    key={tab.href}
                    onClick={() => navigate(tab.href)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors',
                      activeTab === tab.href && 'font-medium text-primary'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <GlobalSearchBar objectId={params.objectId} />
      </div>

      {children}
    </div>
  );
}
