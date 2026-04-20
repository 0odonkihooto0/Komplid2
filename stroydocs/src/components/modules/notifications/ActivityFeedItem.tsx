'use client';

import { cn } from '@/lib/utils';
import type { ActivityLogItem } from './useNotificationsPage';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}

function formatAction(item: ActivityLogItem): { primary: string; secondary: string } {
  const name = item.entityName ?? item.entityType;
  const actor = `${item.user.lastName} ${item.user.firstName}`;
  switch (item.action) {
    case 'created_doc': return { primary: actor, secondary: `создал документ «${name}»` };
    case 'signed_doc': return { primary: actor, secondary: `подписал документ «${name}»` };
    case 'rejected_doc': return { primary: actor, secondary: `отклонил документ «${name}»` };
    case 'approval_required': return { primary: actor, secondary: `ожидает согласования «${name}»` };
    case 'doc_approved': return { primary: actor, secondary: `согласовал документ «${name}»` };
    case 'created_contract': return { primary: actor, secondary: `создал договор «${name}»` };
    case 'created_work_record': return { primary: actor, secondary: `создал запись о работе «${name}»` };
    case 'inspection_reminder': return { primary: 'Система', secondary: `напоминание об инспекции «${name}»` };
    default: return { primary: actor, secondary: `выполнил действие в «${name}»` };
  }
}

function getInitials(item: ActivityLogItem): string {
  const first = item.user.firstName?.[0] ?? '';
  const last = item.user.lastName?.[0] ?? '';
  return `${last}${first}`.toUpperCase() || '?';
}

const AVATAR_COLORS: Record<string, string> = {
  created_doc: 'bg-blue-100 text-blue-700',
  signed_doc: 'bg-emerald-100 text-emerald-700',
  rejected_doc: 'bg-red-100 text-red-700',
  approval_required: 'bg-amber-100 text-amber-700',
  doc_approved: 'bg-emerald-100 text-emerald-700',
  created_contract: 'bg-violet-100 text-violet-700',
  inspection_reminder: 'bg-gray-100 text-gray-600',
};

interface Props {
  item: ActivityLogItem;
  onClick: () => void;
}

export function ActivityFeedItem({ item, onClick }: Props) {
  const { primary, secondary } = formatAction(item);
  const avatarClass = AVATAR_COLORS[item.action] ?? 'bg-muted text-muted-foreground';
  const isSystem = item.action === 'inspection_reminder' || item.source === 'notification';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'relative grid cursor-pointer grid-cols-[32px_1fr_auto] gap-x-2.5 border-b px-4 py-3 transition-colors',
        !item.isRead ? 'bg-primary/[0.03] hover:bg-muted/50' : 'hover:bg-muted/40',
        !item.isRead && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center font-mono text-[11px] font-semibold',
        isSystem ? 'rounded-lg' : 'rounded-full',
        avatarClass
      )}>
        {isSystem ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
        ) : (
          getInitials(item)
        )}
      </div>

      {/* Body */}
      <div className="min-w-0">
        <p className="text-xs leading-snug text-foreground">
          <span className="font-medium">{primary}</span>{' '}
          <span className="text-muted-foreground">{secondary}</span>
        </p>
      </div>

      {/* Time + unread dot */}
      <div className="flex flex-col items-end gap-1.5">
        <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
          {timeAgo(item.createdAt)}
        </span>
        {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </div>
    </div>
  );
}
