'use client';

import { useState } from 'react';
import { GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useGanttStages,
  useGanttVersionsByProject,
} from './useGanttStructure';
import { useGanttCompare } from './useGanttCompare';
import { GanttCompareDiffTable } from './GanttCompareDiffTable';

interface Props {
  objectId: string;
}

export function GanttCompareView({ objectId }: Props) {
  const [stageId, setStageId] = useState<string | null>(null);

  const { stages } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(objectId, stageId);

  const {
    v1Id, setV1Id,
    v2Id, setV2Id,
    result,
    isLoading: compareLoading,
    canCompare,
    triggerCompare,
  } = useGanttCompare(objectId);

  function handleStageChange(val: string) {
    setStageId(val === 'all' ? null : val);
    // Сброс выбранных версий при смене стадии
    setV1Id(null);
    setV2Id(null);
  }

  return (
    <div className="space-y-6">
      {/* Панель выбора версий */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Фильтр по стадии */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Стадия</span>
          <Select onValueChange={handleStageChange} defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все стадии</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Версия V1 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Версия 1 (базовая)</span>
          <Select
            value={v1Id ?? ''}
            onValueChange={(val) => setV1Id(val || null)}
            disabled={versionsLoading}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Выберите версию..." />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Версия V2 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Версия 2 (сравниваемая)</span>
          <Select
            value={v2Id ?? ''}
            onValueChange={(val) => setV2Id(val || null)}
            disabled={versionsLoading}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Выберите версию..." />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Кнопка сравнения */}
        <Button
          onClick={triggerCompare}
          disabled={!canCompare || compareLoading}
          className="gap-2"
        >
          <GitCompare className="h-4 w-4" aria-label="Сравнить версии" />
          Сравнить
        </Button>
      </div>

      {/* Состояния загрузки / результат */}
      {compareLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : result ? (
        <GanttCompareDiffTable result={result} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <GitCompare className="h-10 w-10 mb-3 opacity-30" aria-label="Сравнение версий" />
          <p className="text-sm">
            Выберите две версии ГПР и нажмите «Сравнить»
          </p>
          <p className="text-xs mt-1 opacity-70">
            Отображаются добавленные, удалённые и изменённые задачи
          </p>
        </div>
      )}
    </div>
  );
}
