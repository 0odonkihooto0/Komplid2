'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEstimateHistory } from './useEstimateHistory';
import { formatDateTime } from '@/utils/format';

// Маппинг действий на читаемые описания
const ACTION_LABELS: Record<string, string> = {
  item_created: 'Позиция создана',
  item_updated: 'Позиция обновлена',
  item_deleted: 'Позиция удалена',
  chapter_created: 'Раздел создан',
  chapter_updated: 'Раздел обновлён',
  chapter_deleted: 'Раздел удалён',
  version_recalculated: 'Пересчёт итогов',
  version_renumbered: 'Перенумерация',
  status_changed: 'Статус изменён',
};

const FIELD_LABELS: Record<string, string> = {
  volume: 'Объём',
  unitPrice: 'Цена за ед.',
  totalPrice: 'Итого',
  name: 'Наименование',
  code: 'Код',
  unit: 'Ед. изм.',
  status: 'Статус',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  versionId: string;
}

/** Диалог с историей изменений версии сметы */
export function EstimateHistoryDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  versionId,
}: Props) {
  const { entries, page, setPage, totalPages, total, isLoading } = useEstimateHistory({
    projectId,
    contractId,
    versionId,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История изменений ({total})</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Нет записей об изменениях.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
              const fieldLabel = entry.field ? (FIELD_LABELS[entry.field] ?? entry.field) : null;

              return (
                <div key={entry.id} className="rounded-md border px-3 py-2 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{actionLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>

                  {fieldLabel && (
                    <div className="text-xs text-muted-foreground">
                      <span>{fieldLabel}: </span>
                      {entry.oldValue && (
                        <span className="line-through text-red-500 mr-1">{entry.oldValue}</span>
                      )}
                      {entry.oldValue && entry.newValue && <span className="mr-1">→</span>}
                      {entry.newValue && (
                        <span className="text-green-600">{entry.newValue}</span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {entry.user.lastName} {entry.user.firstName}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t mt-4">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
