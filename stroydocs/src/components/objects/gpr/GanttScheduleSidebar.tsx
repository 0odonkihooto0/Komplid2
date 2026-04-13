'use client';

import { Plus, ArrowDownToLine, Copy, List, Settings } from 'lucide-react';
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
import type { GanttStageItem, GanttVersionSummary } from './useGanttStructure';

interface Props {
  stages: GanttStageItem[];
  versions: GanttVersionSummary[];
  selectedStageId: string | null;
  selectedVersionId: string | null;
  stagesLoading: boolean;
  versionsLoading: boolean;
  onStageChange: (id: string | null) => void;
  onVersionChange: (id: string | null) => void;
  onCreateVersion: () => void;
  onFillFromDirective?: () => void;
  onFillFromVersion?: () => void;
  onOpenVersionSettings?: () => void;
  fillFromVersionPending?: boolean;
}

export function GanttScheduleSidebar({
  stages,
  versions,
  selectedStageId,
  selectedVersionId,
  stagesLoading,
  versionsLoading,
  onStageChange,
  onVersionChange,
  onCreateVersion,
  onFillFromDirective,
  onFillFromVersion,
  onOpenVersionSettings,
  fillFromVersionPending,
}: Props) {
  const hasDirective = versions.some((v: GanttVersionSummary) => v.isDirective);
  const hasSelection = !!selectedVersionId;

  return (
    <div className="flex flex-col gap-2 w-48 shrink-0 border-r pr-3">
      {/* Выбор стадии */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Стадия</Label>
        {stagesLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <Select
            value={selectedStageId ?? 'all'}
            onValueChange={(v: string) => onStageChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="Все стадии" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все стадии</SelectItem>
              {stages.map((s: GanttStageItem) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Выбор версии ГПР */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Версия ГПР</Label>
        {versionsLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <Select
            value={selectedVersionId ?? ''}
            onValueChange={(v: string) => onVersionChange(v || null)}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="Выберите версию" />
            </SelectTrigger>
            <SelectContent>
              {versions.length === 0 ? (
                <SelectItem value="" disabled className="text-xs">
                  Нет версий
                </SelectItem>
              ) : (
                versions.map((v: GanttVersionSummary) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.isDirective ? '📌 ' : ''}{v.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Действия со структурой */}
      <div className="flex flex-col gap-1 pt-1 border-t">
        <Button variant="ghost" size="sm" className="h-7 text-xs justify-start gap-1.5" onClick={onCreateVersion}>
          <Plus className="h-3.5 w-3.5" /> Создать версию
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs justify-start gap-1.5"
          disabled={!hasSelection || !hasDirective || fillFromVersionPending}
          title={!hasDirective ? 'Нет директивной версии' : 'Заполнить из директивной'}
          onClick={onFillFromDirective}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" /> Из директивной
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs justify-start gap-1.5"
          disabled={!hasSelection}
          title="Заполнить из другой версии"
          onClick={onFillFromVersion}
        >
          <Copy className="h-3.5 w-3.5" /> Из другой версии
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs justify-start gap-1.5"
          disabled={!hasSelection}
          title="Настройки версии"
          onClick={onOpenVersionSettings}
        >
          <Settings className="h-3.5 w-3.5" /> Настройки
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs justify-start gap-1.5" disabled>
          <List className="h-3.5 w-3.5" /> Функции
        </Button>
      </div>
    </div>
  );
}
