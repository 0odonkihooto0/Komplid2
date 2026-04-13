'use client';

import { useState, useRef, useCallback } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import type { Task } from 'gantt-task-react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GanttTaskListHeader } from '@/components/modules/gantt/GanttTaskListHeader';
import { GanttTaskPanelGPR } from './GanttTaskPanelGPR';
import { GanttExecDocsSheet } from './GanttExecDocsSheet';
import { GanttColumnSettingsSheet } from './GanttColumnSettingsSheet';
import type { GanttTaskItem, GanttDependencyItem } from '@/components/modules/gantt/ganttTypes';
import type { GanttVersionSummary } from './useGanttStructure';
import { convertToGanttLibTasks } from '@/lib/gantt/converters';
import {
  useGanttTasksGPR,
  useUpdateTasksBulkGPR,
  useDeleteTaskGPR,
} from './useGanttScheduleHooks';

const VIEW_MODE_LABELS: Record<string, string> = {
  [ViewMode.Day]: 'День',
  [ViewMode.Week]: 'Неделя',
  [ViewMode.Month]: 'Месяц',
  [ViewMode.Year]: 'Год',
};

interface Props {
  objectId: string;
  versionId: string;
  version?: GanttVersionSummary | null;
}

interface PendingUpdate {
  planStart?: string;
  planEnd?: string;
  progress?: number;
}

/**
 * Вычислить каскадное смещение зависимых задач (Finish-to-Start).
 */
function computeFsCascade(
  movedTaskId: string,
  newEnd: Date,
  tasks: GanttTaskItem[],
  dependencies: GanttDependencyItem[],
  depth = 0,
): Map<string, { planStart: string; planEnd: string }> {
  const result = new Map<string, { planStart: string; planEnd: string }>();
  if (depth >= 10) return result;

  const fsDeps = dependencies.filter(
    (d) => d.type === 'FS' && d.predecessorId === movedTaskId,
  );

  for (const dep of fsDeps) {
    const successor = tasks.find((t) => t.id === dep.successorId);
    if (!successor) continue;

    const successorStart = new Date(successor.planStart);
    const successorEnd = new Date(successor.planEnd);
    const duration = successorEnd.getTime() - successorStart.getTime();

    if (successorStart < newEnd) {
      const lagMs = (dep.lagDays ?? 0) * 24 * 60 * 60 * 1000;
      const newSuccessorStart = new Date(newEnd.getTime() + lagMs);
      const newSuccessorEnd = new Date(newSuccessorStart.getTime() + duration);

      result.set(dep.successorId, {
        planStart: newSuccessorStart.toISOString(),
        planEnd: newSuccessorEnd.toISOString(),
      });

      const nested = computeFsCascade(
        dep.successorId,
        newSuccessorEnd,
        tasks,
        dependencies,
        depth + 1,
      );
      nested.forEach((update, id) => {
        result.set(id, update);
      });
    }
  }

  return result;
}

export function GanttChartGPR({ objectId, versionId, version }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedTask, setSelectedTask] = useState<GanttTaskItem | null>(null);
  const [execDocsTaskId, setExecDocsTaskId] = useState<string | null>(null);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);
  const updateBulk = useUpdateTasksBulkGPR(objectId, versionId);
  const deleteTask = useDeleteTaskGPR(objectId, versionId);

  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0) return;
    const updates = Array.from(pendingUpdates.current.entries()).map(([id, upd]) => ({
      id,
      ...upd,
    }));
    pendingUpdates.current.clear();
    updateBulk.mutate(updates);
  }, [updateBulk]);

  function scheduleFlush() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flushUpdates, 300);
  }

  function handleDateChange(task: Task) {
    pendingUpdates.current.set(task.id, {
      planStart: task.start.toISOString(),
      planEnd: task.end.toISOString(),
    });

    if (data.dependencies.length > 0) {
      const cascade = computeFsCascade(task.id, task.end, data.tasks, data.dependencies);
      cascade.forEach((update, id) => {
        if (id !== task.id) {
          pendingUpdates.current.set(id, update);
        }
      });
    }

    scheduleFlush();
  }

  function handleProgressChange(task: Task) {
    pendingUpdates.current.set(task.id, {
      ...pendingUpdates.current.get(task.id),
      progress: task.progress,
    });
    scheduleFlush();
  }

  function handleTaskDelete(task: Task) {
    deleteTask.mutate(task.id);
    if (selectedTask?.id === task.id) setSelectedTask(null);
    return true;
  }

  function handleTaskSelect(task: Task, isSelected: boolean) {
    if (!isSelected) {
      setSelectedTask(null);
      return;
    }
    const found = data.tasks.find((t) => t.id === task.id);
    setSelectedTask(found ?? null);
  }

  const ganttTasks = convertToGanttLibTasks(data.tasks);
  const execDocsTask = selectedTask ?? data.tasks.find((t) => t.id === execDocsTaskId);

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 space-y-3">
        {/* Панель управления видом */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {[ViewMode.Day, ViewMode.Week, ViewMode.Month, ViewMode.Year].map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode)}
              >
                {VIEW_MODE_LABELS[mode]}
              </Button>
            ))}
          </div>
          <div className="flex-1" />
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            ● Критический путь
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            ● План
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            ● Выполнено
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setColumnSettingsOpen(true)}>
                Настроить колонки
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Диаграмма */}
        {isLoading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : ganttTasks.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              Нет задач. Создайте задачи или используйте &quot;Из видов работ&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDateChange={handleDateChange}
              onProgressChange={handleProgressChange}
              onDelete={handleTaskDelete}
              onSelect={handleTaskSelect}
              listCellWidth="220px"
              columnWidth={viewMode === ViewMode.Day ? 40 : viewMode === ViewMode.Year ? 120 : 60}
              locale="ru-RU"
              todayColor="rgba(37, 99, 235, 0.1)"
              TaskListHeader={GanttTaskListHeader}
            />
          </div>
        )}
      </div>

      {/* Панель редактирования */}
      {selectedTask && (
        <GanttTaskPanelGPR
          task={selectedTask}
          objectId={objectId}
          versionId={versionId}
          allTasks={data.tasks}
          onClose={() => setSelectedTask(null)}
          onExecDocsOpen={() => setExecDocsTaskId(selectedTask.id)}
        />
      )}

      {/* Sheet с ИД */}
      {execDocsTaskId && execDocsTask && (
        <GanttExecDocsSheet
          objectId={objectId}
          versionId={versionId}
          taskId={execDocsTaskId}
          taskName={execDocsTask.name}
          open={!!execDocsTaskId}
          onClose={() => setExecDocsTaskId(null)}
        />
      )}

      {/* Настройка колонок */}
      <GanttColumnSettingsSheet
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        objectId={objectId}
        versionId={versionId}
        currentSettings={version?.columnSettings ?? null}
      />
    </div>
  );
}
