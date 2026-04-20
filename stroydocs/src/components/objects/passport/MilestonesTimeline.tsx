'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/utils/format';
import type { GanttTaskStatus } from '@prisma/client';

interface Milestone {
  id: string;
  name: string;
  planStart: string;
  planEnd: string;
  directiveStart: string | null;
  directiveEnd: string | null;
  status: GanttTaskStatus;
  comment: string | null;
}

const STATUS_CONFIG: Record<GanttTaskStatus, { dot: string; label: string; badge: string }> = {
  COMPLETED:   { dot: 'bg-green-500',  label: 'Завершена',    badge: 'bg-green-50 text-green-700' },
  IN_PROGRESS: { dot: 'bg-orange-400', label: 'В работе',     badge: 'bg-orange-50 text-orange-700' },
  DELAYED:     { dot: 'bg-red-500',    label: 'Задержка',     badge: 'bg-red-50 text-red-700' },
  NOT_STARTED: { dot: 'bg-gray-300',   label: 'Не начата',    badge: 'bg-gray-100 text-gray-600' },
  ON_HOLD:     { dot: 'bg-yellow-400', label: 'Приостановлена', badge: 'bg-yellow-50 text-yellow-700' },
};

interface MilestonesTimelineProps {
  projectId: string;
}

export function MilestonesTimeline({ projectId }: MilestonesTimelineProps) {
  const { data: milestones, isLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      const json = await res.json() as { success: boolean; data: Milestone[] };
      if (!json.success) return [];
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="rounded-panel">
      <CardHeader className="pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ЭТАПЫ</p>
          <CardTitle className="text-base">Ключевые вехи</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-muted" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-4 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : !milestones || milestones.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Ключевые вехи не определены.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Отметьте задачи в ГПР как вехи для отображения здесь.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-5">
              {milestones.map((m) => {
                const cfg = STATUS_CONFIG[m.status];
                return (
                  <div key={m.id} className="flex gap-3">
                    <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-background ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {formatDate(m.planEnd)}
                          </p>
                          <p className="text-sm font-medium leading-tight">{m.name}</p>
                          {m.comment && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{m.comment}</p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
