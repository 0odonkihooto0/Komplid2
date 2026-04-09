'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGanttStages, useGanttVersionsByProject } from './useGanttStructure';
import { GanttDailyTable } from './GanttDailyTable';

interface Props {
  objectId: string;
}

export function GanttDailyView({ objectId }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { stages, isLoading: stagesLoading } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(
    objectId,
    selectedStageId,
  );

  const canShow = !!selectedVersionId && !!selectedDate;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      {/* Панель управления */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Выбор стадии */}
        <div className="space-y-1 min-w-40">
          <Label className="text-xs text-muted-foreground">Стадия</Label>
          {stagesLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <Select
              value={selectedStageId ?? 'all'}
              onValueChange={(v) => {
                setSelectedStageId(v === 'all' ? null : v);
                setSelectedVersionId(null);
              }}
            >
              <SelectTrigger className="h-9 text-sm w-40">
                <SelectValue placeholder="Все стадии" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все стадии</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Выбор версии */}
        <div className="space-y-1 min-w-52">
          <Label className="text-xs text-muted-foreground">Версия ГПР</Label>
          {versionsLoading ? (
            <Skeleton className="h-9 w-52" />
          ) : (
            <Select
              value={selectedVersionId ?? ''}
              onValueChange={(v) => setSelectedVersionId(v || null)}
            >
              <SelectTrigger className="h-9 text-sm w-52">
                <SelectValue placeholder="Выберите версию" />
              </SelectTrigger>
              <SelectContent>
                {versions.length === 0 ? (
                  <SelectItem value="" disabled>
                    Нет версий
                  </SelectItem>
                ) : (
                  versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.isDirective ? '📌 ' : ''}
                      {v.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Выбор даты */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Дата</Label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex-1" />

        {/* Печать наряда-задания */}
        <Button
          variant="outline"
          size="sm"
          disabled={!canShow}
          onClick={handlePrint}
        >
          <Printer className="mr-1 h-4 w-4" />
          Наряд-задание
        </Button>
      </div>

      {/* Контент */}
      {canShow ? (
        <GanttDailyTable
          objectId={objectId}
          versionId={selectedVersionId}
          date={selectedDate}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Выберите версию ГПР и дату для отображения суточного плана.
          </p>
        </div>
      )}
    </div>
  );
}
