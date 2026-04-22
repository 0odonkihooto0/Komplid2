'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FileText,
  BookOpen,
  BarChart3,
  Monitor,
  Inbox,
  ClipboardList,
  Library,
  Users,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useInboxCount } from '@/hooks/useInboxCount';
import { NotificationDropdown } from './NotificationDropdown';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showInboxBadge?: boolean;
  statsKey?: 'projectsCount' | 'documentsTotal' | 'tasksTotal';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'ГЛАВНОЕ',
    items: [
      { href: '/',          label: 'Дашборд',   icon: LayoutDashboard },
      { href: '/objects',   label: 'Объекты',   icon: Building2,   statsKey: 'projectsCount' },
      { href: '/documents', label: 'Документы', icon: FileText,    statsKey: 'documentsTotal' },
      { href: '/planner',   label: 'Задачи',    icon: ClipboardList, statsKey: 'tasksTotal' },
      { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
      { href: '/inbox',     label: 'Входящие',  icon: Inbox, showInboxBadge: true },
    ],
  },
  {
    title: 'ОРГАНИЗАЦИЯ',
    items: [
      { href: '/organizations', label: 'Участники', icon: Users },
    ],
  },
  {
    title: 'ДОПОЛНИТЕЛЬНО',
    items: [
      { href: '/monitoring',  label: 'Мониторинг',   icon: Monitor },
      { href: '/templates',   label: 'Шаблоны',      icon: BookOpen },
      { href: '/references',  label: 'Справочники',  icon: Library },
    ],
  },
];

interface StatsData {
  projectsCount: number;
  documentsTotal: number;
  tasksTotal: number;
}

interface Props {
  isCollapsed: boolean;
}

export function SidebarNav({ isCollapsed }: Props) {
  const pathname = usePathname();
  const inboxCount = useInboxCount();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const { data: stats } = useQuery<StatsData>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      return json.success ? json.data : { projectsCount: 0, documentsTotal: 0, tasksTotal: 0 };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  function renderItem(item: NavItem) {
    const isActive = item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href);

    const count: number | undefined = item.showInboxBadge
      ? inboxCount
      : item.statsKey && stats
        ? stats[item.statsKey]
        : undefined;
    const hasCount = typeof count === 'number' && count > 0;

    const badge = hasCount && !isCollapsed ? (
      <span
        className={cn(
          'ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-[999px] px-1 font-mono text-[10px] font-semibold',
          isActive ? 'bg-white/15 text-white' : 'bg-white/10 text-white/80'
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

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
          {isCollapsed && hasCount && (
            <span
              className="absolute -top-1 -right-1 h-2 w-2 rounded-full"
              style={{ background: 'var(--accent-bg)' }}
            />
          )}
        </div>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {badge}
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
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!isCollapsed && (
              <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">
                {group.title}
              </p>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => renderItem(item))}
            </nav>
          </div>
        ))}

        {/* Уведомления — Popover вместо обычной ссылки */}
        <NotificationDropdown isCollapsed={isCollapsed} />

        {/* Секция администрирования — только для роли ADMIN */}
        {isAdmin && (
          <div>
            {!isCollapsed && (
              <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">
                АДМИНИСТРИРОВАНИЕ
              </p>
            )}
            <nav className="space-y-0.5">
              {renderItem({ href: '/admin/billing', label: 'Биллинг', icon: CreditCard })}
              {renderItem({ href: '/admin/referrals', label: 'Рефералы', icon: Users })}
            </nav>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
