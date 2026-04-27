'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditLogEntry } from '@/hooks/useAuditLog';

const ACTION_LABELS: Record<string, string> = {
  'auth.signup': 'Регистрация',
  'auth.signin': 'Вход в систему',
  'auth.signout': 'Выход из системы',
  'auth.password_changed': 'Смена пароля',
  'workspace.created': 'Воркспейс создан',
  'workspace.updated': 'Воркспейс обновлён',
  'workspace.deleted': 'Воркспейс удалён',
  'workspace.transferred_ownership': 'Передача владения',
  'member.invited': 'Участник приглашён',
  'member.joined': 'Участник вступил',
  'member.role_changed': 'Роль изменена',
  'member.suspended': 'Участник приостановлен',
  'member.reactivated': 'Участник восстановлен',
  'member.removed': 'Участник удалён',
  'subscription.created': 'Подписка создана',
  'subscription.upgraded': 'Подписка повышена',
  'subscription.downgraded': 'Подписка понижена',
  'subscription.cancelled': 'Подписка отменена',
  'subscription.payment_failed': 'Платёж не прошёл',
  'project.created': 'Проект создан',
  'project.published_dashboard': 'Дашборд опубликован',
  'project.member_added': 'Участник добавлен в проект',
  'project.member_removed': 'Участник удалён из проекта',
  'document.signed': 'Документ подписан',
  'document.rejected': 'Документ отклонён',
  'document.deleted': 'Документ удалён',
};

function actionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('deleted') || action.includes('removed') || action.includes('cancelled') || action.includes('failed')) {
    return 'destructive';
  }
  if (action.includes('created') || action.includes('signup') || action.includes('joined')) {
    return 'default';
  }
  if (action.includes('suspended') || action.includes('rejected')) {
    return 'secondary';
  }
  return 'outline';
}

function DiffRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = entry.before !== null || entry.after !== null;
  const [metaExpanded, setMetaExpanded] = useState(false);
  const hasMeta = entry.ipAddress || entry.userAgent;

  return (
    <>
      <TableRow className="hover:bg-muted/40">
        {/* Дата */}
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          <span
            title={format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm:ss')}
            className="cursor-default"
          >
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ru })}
          </span>
        </TableCell>

        {/* Актор */}
        <TableCell className="text-sm">
          {entry.actor ? (
            <span className="font-medium">
              {entry.actor.firstName} {entry.actor.lastName}
              <br />
              <span className="text-xs text-muted-foreground font-normal">{entry.actor.email}</span>
            </span>
          ) : (
            <span className="text-muted-foreground italic text-xs">Система</span>
          )}
        </TableCell>

        {/* Событие */}
        <TableCell>
          <Badge variant={actionBadgeVariant(entry.action)} className="text-xs font-mono">
            {ACTION_LABELS[entry.action] ?? entry.action}
          </Badge>
        </TableCell>

        {/* Ресурс */}
        <TableCell className="text-xs text-muted-foreground font-mono">
          {entry.resourceType && (
            <span>
              {entry.resourceType}
              {entry.resourceId && (
                <span className="opacity-60"> #{entry.resourceId.slice(-6)}</span>
              )}
            </span>
          )}
        </TableCell>

        {/* Детали */}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {hasMeta && (
              <button
                onClick={() => setMetaExpanded((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="IP / User-Agent"
              >
                IP
              </button>
            )}
            {hasDiff && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Показать изменения"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {metaExpanded && hasMeta && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={5} className="py-2 px-4">
            <div className="text-xs font-mono text-muted-foreground space-y-1">
              {entry.ipAddress && <div>IP: {entry.ipAddress}</div>}
              {entry.userAgent && (
                <div className="truncate max-w-2xl" title={entry.userAgent}>
                  UA: {entry.userAgent}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}

      {expanded && hasDiff && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={5} className="py-2 px-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              {entry.before !== undefined && entry.before !== null && (
                <div>
                  <div className="text-muted-foreground mb-1 font-sans">До:</div>
                  <pre className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 overflow-auto max-h-40 text-red-800 dark:text-red-300">
                    {JSON.stringify(entry.before, null, 2)}
                  </pre>
                </div>
              )}
              {entry.after !== undefined && entry.after !== null && (
                <div>
                  <div className="text-muted-foreground mb-1 font-sans">После:</div>
                  <pre className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 overflow-auto max-h-40 text-green-800 dark:text-green-300">
                    {JSON.stringify(entry.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface Props {
  entries: AuditLogEntry[];
  isLoading?: boolean;
}

export function AuditLogTable({ entries, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        События не найдены. Измените фильтры или подождите первых действий.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-36">Когда</TableHead>
          <TableHead className="w-48">Кто</TableHead>
          <TableHead>Событие</TableHead>
          <TableHead className="w-40">Ресурс</TableHead>
          <TableHead className="w-16 text-right">Детали</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <DiffRow key={entry.id} entry={entry} />
        ))}
      </TableBody>
    </Table>
  );
}
