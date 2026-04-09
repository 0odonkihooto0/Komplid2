'use client';

import { useState } from 'react';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { GanttChartGPR } from './GanttChartGPR';
import {
  useGanttStages,
  useGanttVersionsByProject,
} from './useGanttStructure';
import { useCreateTaskGPR, useAutoFillFromWorkItems } from './useGanttScheduleHooks';

interface Props {
  objectId: string;
}

interface NewTaskForm {
  name: string;
  planStart: string;
  planEnd: string;
}

export function GanttScheduleView({ objectId }: Props) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewTaskForm>({
    name: '',
    planStart: new Date().toISOString().slice(0, 10),
    planEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const { stages, isLoading: stagesLoading } = useGanttStages(objectId);
  const { versions, isLoading: versionsLoading } = useGanttVersionsByProject(
    objectId,
    selectedStageId,
  );

  const createTask = useCreateTaskGPR(objectId, selectedVersionId ?? '');
  const autoFill = useAutoFillFromWorkItems(objectId, selectedVersionId ?? '');

  function handleCreateTask() {
    if (!selectedVersionId || !form.name.trim()) return;
    createTask.mutate(
      {
        name: form.name.trim(),
        planStart: new Date(form.planStart).toISOString(),
        planEnd: new Date(form.planEnd).toISOString(),
        level: 0,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  return (
    <div className="space-y-4">
      {/* Верхняя панель управления */}
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

        {/* Выбор версии ГПР */}
        <div className="space-y-1 min-w-56">
          <Label className="text-xs text-muted-foreground">Версия ГПР</Label>
          {versionsLoading ? (
            <Skeleton className="h-9 w-56" />
          ) : (
            <Select
              value={selectedVersionId ?? ''}
              onValueChange={(v) => setSelectedVersionId(v || null)}
            >
              <SelectTrigger className="h-9 text-sm w-56">
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
                      {v.isDirective ? '📌 ' : ''}{v.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1" />

        {/* Кнопки действий */}
        {selectedVersionId && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoFill.mutate()}
              disabled={autoFill.isPending}
            >
              {autoFill.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Из видов работ
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить задачу
            </Button>
          </>
        )}
      </div>

      {/* Диаграмма Ганта */}
      {!selectedVersionId ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">Выберите версию ГПР для просмотра графика</p>
        </div>
      ) : (
        <GanttChartGPR objectId={objectId} versionId={selectedVersionId} />
      )}

      {/* Диалог создания задачи */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Наименование</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Введите наименование задачи"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Начало план</Label>
                <Input
                  type="date"
                  value={form.planStart}
                  onChange={(e) => setForm((f) => ({ ...f, planStart: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Конец план</Label>
                <Input
                  type="date"
                  value={form.planEnd}
                  onChange={(e) => setForm((f) => ({ ...f, planEnd: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
              disabled={!form.name.trim() || createTask.isPending}
            >
              {createTask.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
