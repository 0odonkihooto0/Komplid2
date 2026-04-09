'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, FileText, BookOpen, BarChart3, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUnreadCount } from '@/hooks/useUnreadCount';

const navItems = [
  { href: '/', label: 'Главная', icon: LayoutDashboard, showBadge: true },
  { href: '/objects', label: 'Объекты', icon: Building2 },
  { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/monitoring', label: 'Мониторинг', icon: Monitor },
  { href: '/documents', label: 'Документы', icon: FileText },
  { href: '/templates', label: 'Шаблоны', icon: BookOpen },
];

interface Props {
  isCollapsed: boolean;
}

export function SidebarNav({ isCollapsed }: Props) {
  const pathname = usePathname();
  const unreadCount = useUnreadCount();

  return (
    <TooltipProvider delayDuration={100}>
      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          const badge = item.showBadge && unreadCount > 0 ? (
            <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null;

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
                {isCollapsed && unreadCount > 0 && item.showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white" />
                )}
              </div>
              {!isCollapsed && item.label}
              {!isCollapsed && badge}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                  {item.showBadge && unreadCount > 0 && ` (${unreadCount})`}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}

      </nav>
    </TooltipProvider>
  );
}
