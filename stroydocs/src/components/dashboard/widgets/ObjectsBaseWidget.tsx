'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ObjectSummary {
  id: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'В работе',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  ARCHIVED: 'bg-gray-400',
};

interface ObjectsBaseWidgetProps {
  objectIds?: string[];
  onStatusFilter?: (status: string | null) => void;
}

export function ObjectsBaseWidget({ objectIds, onStatusFilter }: ObjectsBaseWidgetProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery<ObjectSummary[]>({
    queryKey: ['dashboard-objects-summary', objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (objectIds && objectIds.length > 0) params.set('objectIds', objectIds.join(','));
      const qs = params.size > 0 ? `?${params.toString()}` : '';
      const res = await fetch(`/api/dashboard/objects-summary${qs}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Группировка по статусу
  const statusGroups = data.reduce<Record<string, number>>((acc, obj) => {
    acc[obj.status] = (acc[obj.status] ?? 0) + 1;
    return acc;
  }, {});
  const total = data.length;

  const handleRowClick = (status: string) => {
    const next = selectedStatus === status ? null : status;
    setSelectedStatus(next);
    onStatusFilter?.(next);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" />
            База объектов
          </CardTitle>
          {selectedStatus && (
            <Badge variant="secondary" className="text-[10px] h-4 cursor-pointer" onClick={() => handleRowClick(selectedStatus)}>
              {STATUS_LABEL[selectedStatus] ?? selectedStatus} ×
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Крупная цифра + кнопка */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold text-primary">{total}</span>
            <span className="ml-2 text-sm text-muted-foreground">
              {total === 1 ? 'объект' : total >= 2 && total <= 4 ? 'объекта' : 'объектов'}
            </span>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" />Свернуть схему</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" />Показать схему</>
            )}
          </button>
        </div>

        {/* Таблица по статусам */}
        {expanded && (
          <div className="rounded-md border overflow-hidden">
            {/* Заголовок */}
            <div className="grid grid-cols-[1fr_auto_auto] bg-muted/50 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              <span>Статус</span>
              <span className="w-14 text-right">Кол-во</span>
              <span className="w-10 text-right">%</span>
            </div>
            {/* Строки */}
            {Object.keys(STATUS_LABEL).map((status) => {
              const count = statusGroups[status] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const isSelected = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => count > 0 && handleRowClick(status)}
                  disabled={count === 0}
                  className={[
                    'w-full grid grid-cols-[1fr_auto_auto] items-center px-3 py-2',
                    'text-xs border-t transition-colors text-left',
                    count > 0 ? 'cursor-pointer hover:bg-muted/60' : 'cursor-default opacity-50',
                    isSelected ? 'bg-primary/10 font-semibold' : '',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_COLOR[status] ?? 'bg-muted'}`} />
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="w-14 text-right tabular-nums">{count}</span>
                  <span className="w-10 text-right tabular-nums text-muted-foreground">{pct}%</span>
                </button>
              );
            })}
            {/* Итого */}
            <div className="grid grid-cols-[1fr_auto_auto] px-3 py-2 bg-muted/30 border-t text-xs font-semibold">
              <span>Итого</span>
              <span className="w-14 text-right tabular-nums">{total}</span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">100%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
