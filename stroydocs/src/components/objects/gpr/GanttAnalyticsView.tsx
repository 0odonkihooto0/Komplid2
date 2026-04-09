'use client';

import { useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGanttStages, useGanttVersionsByProject } from './useGanttStructure';
import { useGanttAnalytics } from './useGanttAnalytics';
import { GanttSCurveWidget } from './GanttSCurveWidget';
import { GanttCurrentProgressWidget } from './GanttCurrentProgressWidget';
import { GanttDeviationsWidget } from './GanttDeviationsWidget';
import { GanttIdReadinessWidget } from './GanttIdReadinessWidget';

interface Props {
  objectId: string;
}

export function GanttAnalyticsView({ objectId }: Props) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isCumulative, setIsCumulative] = useState(true);

  // ── Данные стадий и версий ─────────────────────────────────────────────────
  const { stages } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(objectId, selectedStageId);

  // Даты из выбранной версии для S-кривой
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;
  const startDate = selectedVersion?.planStart ?? undefined;
  const endDate = selectedVersion?.planEnd ?? undefined;

  // ── Аналитика ─────────────────────────────────────────────────────────────
  const { data, isLoading: analyticsLoading } = useGanttAnalytics(
    objectId, selectedVersionId, startDate, endDate,
  );

  const isLoading = versionsLoading || analyticsLoading;

  function handleStageChange(val: string) {
    setSelectedStageId(val === 'all' ? null : val);
    setSelectedVersionId(null);
  }

  return (
    <div className="space-y-4">
      {/* ── Панель выбора стадии и версии ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select onValueChange={handleStageChange} defaultValue="all">
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Все стадии" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все стадии</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={setSelectedVersionId}
          value={selectedVersionId ?? ''}
          disabled={versions.length === 0}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Выберите версию ГПР" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}{v.isDirective ? ' ★' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Заглушка до выбора версии ─────────────────────────────────────── */}
      {!selectedVersionId && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            Выберите версию ГПР для просмотра аналитики
          </p>
        </div>
      )}

      {/* ── Скелетон загрузки ─────────────────────────────────────────────── */}
      {selectedVersionId && isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* ── 4 виджета в сетке 2×2 ────────────────────────────────────────── */}
      {selectedVersionId && !isLoading && data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <GanttSCurveWidget
            sCurve={data.sCurve}
            cumulative={isCumulative}
            onCumulativeChange={setIsCumulative}
          />
          <GanttCurrentProgressWidget sCurve={data.sCurve} />
          <GanttDeviationsWidget deviations={data.deviations} />
          <GanttIdReadinessWidget idReadiness={data.idReadiness} />
        </div>
      )}
    </div>
  );
}
