'use client';

import { useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings, TrendingUp } from 'lucide-react';
import { useGanttStages, useGanttVersionsByProject } from './useGanttStructure';
import { useGanttAnalytics } from './useGanttAnalytics';
import { GanttSCurveWidget } from './GanttSCurveWidget';
import { GanttCurrentProgressWidget } from './GanttCurrentProgressWidget';
import { GanttDeviationsWidget } from './GanttDeviationsWidget';
import { GanttIdReadinessWidget } from './GanttIdReadinessWidget';
import { GanttEvmPanel } from './GanttEvmPanel';
import {
  GanttAnalyticsSettingsDialog,
  DEFAULT_ANALYTICS_SETTINGS,
  type AnalyticsSettings,
} from './GanttAnalyticsSettingsDialog';

interface Props {
  objectId: string;
}

export function GanttAnalyticsView({ objectId }: Props) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isCumulative, setIsCumulative] = useState(true);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showSCurve, setShowSCurve] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AnalyticsSettings>(DEFAULT_ANALYTICS_SETTINGS);

  // ── Данные стадий и версий ─────────────────────────────────────────────────
  const { stages } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(objectId, selectedStageId);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;
  const startDate = selectedVersion?.planStart ?? undefined;
  const endDate = selectedVersion?.planEnd ?? undefined;

  // ── Аналитика ─────────────────────────────────────────────────────────────
  const { data, isLoading: analyticsLoading } = useGanttAnalytics(
    objectId, selectedVersionId, startDate, endDate, reportDate,
  );

  const isLoading = versionsLoading || analyticsLoading;

  function handleStageChange(val: string) {
    setSelectedStageId(val === 'all' ? null : val);
    setSelectedVersionId(null);
  }

  return (
    <div className="space-y-4">
      {/* ── Панель выбора стадии, версии и кнопки ──────────────────────────── */}
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

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={showSCurve ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowSCurve((p) => !p)}
            disabled={!selectedVersionId}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            S-кривая проекта
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setSettingsOpen(true)}
            disabled={!selectedVersionId}
          >
            <Settings className="h-3.5 w-3.5" />
            Настройки
          </Button>
        </div>
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
        <div className="flex gap-4">
          <Skeleton className="h-[400px] flex-1 rounded-lg" />
          <Skeleton className="h-[400px] w-80 shrink-0 rounded-lg" />
        </div>
      )}

      {/* ── Основной лейаут: S-кривая слева + EVM панель справа ──────────── */}
      {selectedVersionId && !isLoading && data && (
        <div className="flex gap-4 items-start">
          {/* Левая часть — S-кривая + доп. виджеты */}
          <div className="flex-1 min-w-0 space-y-4">
            {showSCurve && (
              <GanttSCurveWidget
                sCurve={data.sCurve}
                cumulative={isCumulative}
                onCumulativeChange={setIsCumulative}
              />
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <GanttCurrentProgressWidget sCurve={data.sCurve} />
              <GanttDeviationsWidget deviations={data.deviations} />
              <GanttIdReadinessWidget idReadiness={data.idReadiness} />
            </div>
          </div>

          {/* Правая часть — панель EVM-показателей */}
          <div className="w-80 shrink-0">
            <GanttEvmPanel
              data={data}
              reportDate={reportDate}
              onReportDateChange={setReportDate}
            />
          </div>
        </div>
      )}

      {/* Диалог настроек */}
      <GanttAnalyticsSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onApply={setSettings}
      />
    </div>
  );
}
