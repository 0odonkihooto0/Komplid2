'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { SidebarNav } from './SidebarNav';
import { SidebarProjectsList } from './SidebarProjectsList';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sidebar-collapsed';

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Читаем состояние из localStorage после mount (избегаем hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setIsCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // Скрываем список объектов когда пользователь уже находится внутри объекта
  // (там есть собственный ObjectModuleSidebar в layout)
  const isInsideObject = pathname.startsWith('/objects/') && pathname.split('/').length > 3;

  if (!mounted) {
    return (
      <aside
        className="flex h-screen w-60 flex-col border-r border-white/[0.06]"
        style={{ background: 'var(--sidebar-bg)' }}
      />
    );
  }

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-white/[0.06] transition-all duration-200',
        isCollapsed ? 'w-14' : 'w-60'
      )}
      style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-ink)' }}
    >
      {/* Шапка с логотипом и кнопкой свёртывания */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-white/[0.06]',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--accent-bg)] font-bold text-base text-white">
            K
          </div>
          {!isCollapsed && (
            <span className="text-[15px] font-semibold tracking-tight">Komplid</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 flex-shrink-0 text-white/60 hover:text-white hover:bg-white/[0.08]', isCollapsed && 'ml-0')}
          onClick={toggle}
          aria-label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Навигация + список объектов */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
        <SidebarNav isCollapsed={isCollapsed} />

        {/* Список объектов — скрывается когда открыт конкретный объект */}
        {!isCollapsed && !isInsideObject && (
          <>
            <div className="border-t border-white/10 mx-2" />
            <SidebarProjectsList />
          </>
        )}
      </div>

      {/* Workspace switcher + профиль внизу */}
      {session?.user && (
        <>
          <div className="border-t border-white/10" />
          <WorkspaceSwitcher isCollapsed={isCollapsed} />
        </>
      )}
    </aside>
  );
}
