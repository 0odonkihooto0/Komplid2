'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText,
  Calendar,
  Package,
  BookOpen,
  Shield,
  Scale,
  BarChart2,
  Info,
  Mail,
  Menu,
  X,
  Briefcase,
  Layers,
  Box,
} from 'lucide-react';

interface ModuleItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: true;
}

const MODULES: ModuleItem[] = [
  { label: 'Информация',     href: 'info',       icon: Info },
  { label: 'СЭД',                  href: 'sed',                        icon: Mail },
  { label: 'Управление проектом', href: 'project-management/contracts', icon: Briefcase },
  { label: 'ПИР',           href: 'pir/design-task',      icon: Layers },
  { label: 'ТИМ',           href: 'tim',                  icon: Box },
  // Будущие модули — доступны после реализации соответствующих шагов
  { label: 'ГПР',            href: 'gpr/structure', icon: Calendar },
  { label: 'Ресурсы',        href: 'resources',  icon: Package },
  { label: 'Журналы',        href: 'journals',   icon: BookOpen },
  { label: 'ИД',             href: 'id',         icon: FileText },
  { label: 'Стройконтроль',  href: 'sk/inspections', icon: Shield },
  { label: 'Сметы',          href: 'estimates', icon: Scale },
  { label: 'Отчёты',         href: 'reports',    icon: BarChart2 },
];

interface Props {
  objectId: string;
}

export function ObjectModuleSidebar({ objectId }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = (
    <nav className="space-y-1 px-2">
      {MODULES.map(({ label, href, icon: Icon, soon }) => {
        const fullHref = `/objects/${objectId}/${href}`;
        const isActive = pathname.startsWith(fullHref);

        return (
          <Link
            key={href}
            href={soon ? '#' : fullHref}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              soon && 'pointer-events-none opacity-40'
            )}
            aria-disabled={soon}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            {soon && (
              <span className="ml-auto rounded bg-muted px-1 text-[10px] text-muted-foreground">
                скоро
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Кнопка-гамбургер — только на мобильных */}
      <button
        className="fixed left-4 top-4 z-50 rounded-md border bg-background p-2 shadow-sm md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Затемнение фона на мобильных при открытом меню */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar: слайд-панель на мобильных, фиксированная колонка на десктопе */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-52 shrink-0 border-r bg-background py-4 transition-transform duration-200',
          'md:relative md:inset-auto md:z-auto md:translate-x-0 md:bg-muted/30',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Отступ для кнопки гамбургера на мобильных */}
        <div className="mb-2 h-10 md:hidden" />
        {navItems}
      </aside>
    </>
  );
}
