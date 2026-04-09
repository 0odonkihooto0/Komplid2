'use client';

import { useState } from 'react';
import { Plus, CalendarDays, Thermometer, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { DailyLogFormDialog } from './DailyLogFormDialog';
import { useDailyLogs, useCreateDailyLog, useUpdateDailyLog, type DailyLogItem } from './useDailyLogs';
import { formatDate } from '@/utils/format';

const WEATHER_ICONS: Record<string, string> = {
  ясно: '☀️',
  облачно: '⛅',
  пасмурно: '☁️',
  дождь: '🌧️',
  снег: '❄️',
  мороз: '🥶',
};

interface Props {
  projectId: string;
  contractId: string;
}

export function DailyLogTab({ projectId, contractId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLog, setEditLog] = useState<DailyLogItem | null>(null);

  const { data: logs, isLoading } = useDailyLogs(projectId, contractId);
  const createLog = useCreateDailyLog(projectId, contractId);
  const updateLog = useUpdateDailyLog(projectId, contractId);

  function handleOpenCreate() {
    setEditLog(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(log: DailyLogItem) {
    setEditLog(log);
    setDialogOpen(true);
  }

  function handleSubmit(data: {
    date: string;
    weather?: string;
    temperature?: number;
    workersCount?: number;
    notes?: string;
  }) {
    if (editLog) {
      updateLog.mutate(
        { logId: editLog.id, ...data },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createLog.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ежедневный журнал производства работ
        </p>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Отметить день
        </Button>
      </div>

      {(!logs || logs.length === 0) ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="Нет записей"
          description="Фиксируйте ежедневный прогресс работ, погоду и количество рабочих"
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Первая запись
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => handleOpenEdit(log)}
              className="w-full rounded-lg border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {formatDate(log.date)}
                  </span>
                  {log.weather && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      {WEATHER_ICONS[log.weather] ?? ''} {log.weather}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  {log.temperature != null && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5" />
                      {log.temperature > 0 ? '+' : ''}{log.temperature}°C
                    </span>
                  )}
                  {log.workersCount != null && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {log.workersCount} чел.
                    </span>
                  )}
                </div>
              </div>
              {log.notes && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{log.notes}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {log.author.lastName} {log.author.firstName}
              </p>
            </button>
          ))}
        </div>
      )}

      <DailyLogFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editLog={editLog}
        onSubmit={handleSubmit}
        isPending={createLog.isPending || updateLog.isPending}
      />
    </div>
  );
}
