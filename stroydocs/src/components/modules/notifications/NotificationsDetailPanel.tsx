'use client';

import { useRouter } from 'next/navigation';
import { ExternalLink, Check, MessageSquare, RotateCcw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { InboxItemWithRoute } from '@/app/api/notifications/inbox/route';
import { ApprovalRouteSteps } from './ApprovalRouteSteps';
import { CATEGORY_COLORS } from './InboxFeed';

interface Props {
  item: InboxItemWithRoute | null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b py-1.5 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  );
}

export function NotificationsDetailPanel({ item }: Props) {
  const router = useRouter();

  if (!item) {
    return (
      <div className="flex flex-col border-l bg-muted/20">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Детали
          </span>
          <span className="text-sm text-muted-foreground/60">Выберите документ</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-semibold">Ничего не выбрано</p>
          <p className="text-xs text-muted-foreground">
            Нажмите на документ слева, чтобы увидеть маршрут согласования и действия.
          </p>
        </div>
      </div>
    );
  }

  const chipClass = CATEGORY_COLORS[item.category] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <div className="flex flex-col overflow-hidden border-l bg-background">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Детали</span>
        <span className="truncate text-sm font-semibold">{item.typeLabel}</span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Документ */}
        <div className="border-b px-4 py-3">
          <SectionTitle>Документ</SectionTitle>
          <p className="mb-0.5 text-xs font-semibold leading-snug text-foreground">{item.documentName}</p>
          <p className="mb-2 text-[11px] text-muted-foreground">{item.objectName}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide', chipClass)}>
              {item.category}
            </span>
            {item.urgent && (
              <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-red-700">
                срочно
              </span>
            )}
          </div>
        </div>

        {/* Реквизиты */}
        {item.stats.length > 0 && (
          <div className="border-b px-4 py-3">
            <SectionTitle>Реквизиты</SectionTitle>
            {item.stats.map((s) => (
              <StatRow key={s.key} label={s.key} value={s.value} />
            ))}
          </div>
        )}

        {/* Маршрут согласования */}
        <div className="border-b px-4 py-3">
          <SectionTitle>Маршрут согласования</SectionTitle>
          <ApprovalRouteSteps steps={item.routeSteps} />
        </div>

        {/* Срок */}
        {item.deadline && (
          <div className="border-b px-4 py-3">
            <SectionTitle>Срок</SectionTitle>
            <p className={cn('text-xs', 'text-muted-foreground')}>
              {item.deadline}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 px-4 py-4">
          <Button
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            size="sm"
            onClick={() => router.push(item.link)}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Подписать / согласовать
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(item.link)}
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Написать комментарий
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => router.push(item.link)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Вернуть с замечаниями
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => window.open(item.link, '_blank')}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Открыть документ
          </Button>
        </div>
      </div>
    </div>
  );
}
