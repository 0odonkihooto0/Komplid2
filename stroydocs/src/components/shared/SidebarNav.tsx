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
      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          // Badge для входящих документов (Входящие)
          const inboxBadge = item.showInboxBadge && inboxCount > 0 ? (
            <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white px-0.5">
              {inboxCount > 9 ? '9+' : inboxCount}
            </span>
          ) : null;

          const showCollapsedDot = isCollapsed && inboxCount > 0 && item.showInboxBadge;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-blue-600/30 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="h-4 w-4" />
                {/* Badge в свёрнутом режиме — поверх иконки */}
                {showCollapsedDot && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500" />
                )}
              </div>
              {!isCollapsed && item.label}
              {!isCollapsed && inboxBadge}
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
