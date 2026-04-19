'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatActivityLog } from '@/utils/formatActivityLog';
import { useObjectHistory } from './useObjectHistory';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface HistoryDrawerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoryDrawer({ projectId, open, onOpenChange }: HistoryDrawerProps) {
  const { data, isLoading } = useObjectHistory(projectId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>История изменений</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {isLoading && (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          )}
          {!isLoading && data && data.length === 0 && (
            <div className="rounded-panel border border-dashed px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
              Пока нет записей об изменениях.
              <br />
              Как только появится активность по паспорту — она отобразится здесь.
            </div>
          )}
          {!isLoading && data && data.length > 0 && (
            <ul className="space-y-2">
              {data.map((entry) => {
                const f = formatActivityLog(entry);
                return (
                  <li
                    key={entry.id}
                    className="rounded-panel border bg-card px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Chip variant={f.tone === 'neutral' ? 'neutral' : f.tone}>
                        {f.verb}
                      </Chip>
                      <time className="font-mono text-xs text-[var(--ink-muted)]">
                        {formatDateTime(entry.createdAt)}
                      </time>
                    </div>
                    <div className="mt-1.5 text-sm">
                      {f.target && <span className="font-medium">{f.target}</span>}
                    </div>
                    {entry.user && (
                      <div className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {entry.user.fullName}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
