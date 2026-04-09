'use client';

import { useState, useRef, useCallback } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import type { Task } from 'gantt-task-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GanttTaskPanel } from './GanttTaskPanel';
import { GanttTaskListHeader } from './GanttTaskListHeader';
import type { GanttTaskItem, GanttDependencyItem } from './ganttTypes';
import { useGanttTasks, useUpdateTasksBulk, useDeleteTask } from './useGanttTasks';
import { convertToGanttLibTasks } from '@/lib/gantt/converters';

const VIEW_MODE_LABELS: Record<string, string> = {
  [ViewMode.Day]: 'День',
  [ViewMode.Week]: 'Неделя',
  [ViewMode.Month]: 'Месяц',
  [ViewMode.Year]: 'Год',
};

interface Props {
  projectId: string;
  contractId: string;
  versionId: string;
}

interface PendingUpdate {
  planStart?: string;
  planEnd?: string;
  progress?: number;
}

/**
 * Вычислить каскадное смещение зависимых задач (Finish-to-Start).
 * При сдвиге задачи все её FS-последователи сдвигаются пропорционально.
 * Рекурсия ограничена 10 уровнями для предотвращения бесконечного цикла.
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

  // FS-зависимости где movedTaskId = предшественник
  const fsDeps = dependencies.filter(
    (d) => d.type === 'FS' && d.predecessorId === movedTaskId,
  );

  for (const dep of fsDeps) {
    const successor = tasks.find((t) => t.id === dep.successorId);
    if (!successor) continue;

    const successorStart = new Date(successor.planStart);
    const successorEnd = new Date(successor.planEnd);
    const duration = successorEnd.getTime() - successorStart.getTime();

    // Сдвигаем только если последователь начинается раньше, чем заканчивается предшественник
    if (successorStart < newEnd) {
      const lagMs = (dep.lagDays ?? 0) * 24 * 60 * 60 * 1000;
      const newSuccessorStart = new Date(newEnd.getTime() + lagMs);
      const newSuccessorEnd = new Date(newSuccessorStart.getTime() + duration);

      result.set(dep.successorId, {
        planStart: newSuccessorStart.toISOString(),
        planEnd: newSuccessorEnd.toISOString(),
      });

      // Рекурсивно сдвигаем последователей следующего уровня
      const nested = computeFsCascade(
        dep.successorId,
        newSuccessorEnd,
        tasks,
        dependencies,
        depth + 1,
      );
      nested.forEach((update, id) => {
        result.set(id, update); // Более глубокие перекрывают мелкие
      });
    }
  }

  return result;
}

export function GanttChart({ projectId, contractId, versionId }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedTask, setSelectedTask] = useState<GanttTaskItem | null>(null);

  const { data, isLoading } = useGanttTasks(projectId, contractId, versionId);
  const updateBulk = useUpdateTasksBulk(projectId, contractId, versionId);
  const deleteTask = useDeleteTask(projectId, contractId, versionId);

  // Debounce ref для drag-and-drop
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
    // Обновить саму задачу
    pendingUpdates.current.set(task.id, {
      planStart: task.start.toISOString(),
      planEnd: task.end.toISOString(),
    });

    // Каскадно сдвинуть FS-зависимые задачи
    if (data.dependencies.length > 0) {
      const cascade = computeFsCascade(task.id, task.end, data.tasks, data.dependencies);
      cascade.forEach((update, id) => {
        // Не перезаписывать обновление самой изменённой задачи
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
        </div>

        {/* Диаграмма */}
        {isLoading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : ganttTasks.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              Нет задач. Создайте задачи или используйте &quot;Автозаполнение из видов работ&quot;.
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
        <GanttTaskPanel
          task={selectedTask}
          projectId={projectId}
          contractId={contractId}
          versionId={versionId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
