'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, FileText, BookOpen, BarChart3, Monitor, Inbox, ClipboardList, Library, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInboxCount } from '@/hooks/useInboxCount';
import { NotificationDropdown } from './NotificationDropdown';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showInboxBadge?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Главная', icon: LayoutDashboard },
  { href: '/inbox', label: 'Входящие', icon: Inbox, showInboxBadge: true },
  { href: '/planner', label: 'Планировщик задач', icon: ClipboardList },
  { href: '/objects', label: 'Объекты', icon: Building2 },
  { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/monitoring', label: 'Мониторинг', icon: Monitor },
  { href: '/documents', label: 'Документы', icon: FileText },
  { href: '/templates', label: 'Шаблоны', icon: BookOpen },
  { href: '/references', label: 'Справочники', icon: Library },
];

interface Props {
  isCollapsed: boolean;
}

export function SidebarNav({ isCollapsed }: Props) {
  const pathname = usePathname();
  const inboxCount = useInboxCount();

  return (
    <TooltipProvider delayDuration={100}>
      {!isCollapsed && (
        <p className="mb-1.5 px-4 font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">
          Навигация
        </p>
      )}
      <nav className="space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          // TODO: design conflict — счётчики рядом с пунктами навигации (Objects, Tasks и т.п.)
          // требуют новых агрегирующих endpoint-ов; рендерим бейдж только когда count определён
          // (для Inbox count уже есть useInboxCount). Пустых плейсхолдеров "0" не показываем.
          const count: number | undefined = item.showInboxBadge ? inboxCount : undefined;
          const hasCount = typeof count === 'number' && count > 0;

          const badge = hasCount ? (
            <span
              className={cn(
                'ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-[999px] px-1 font-mono text-[10px] font-semibold',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'bg-white/10 text-white/80'
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          ) : null;

          const showCollapsedDot = isCollapsed && hasCount;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'flex items-center rounded-[6px] text-[13px] font-medium transition-colors',
                isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-1.5',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="h-4 w-4" />
                {/* Badge в свёрнутом режиме — поверх иконки */}
                {showCollapsedDot && (
                  <span
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full"
                    style={{ background: 'var(--accent-bg)' }}
                  />
                )}
              </div>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && badge}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                  {item.showInboxBadge && inboxCount > 0 && ` (${inboxCount})`}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}

        {/* Уведомления — Popover вместо обычной ссылки */}
        <NotificationDropdown isCollapsed={isCollapsed} />
      </nav>
    </TooltipProvider>
  );
}
