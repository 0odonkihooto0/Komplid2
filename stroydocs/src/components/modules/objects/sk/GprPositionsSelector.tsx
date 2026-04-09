'use client';

import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatchInspection } from './useInspections';

interface GanttVersion {
  id: string;
  name: string;
}

interface GanttTask {
  id: string;
  name: string;
  planStart: string;
  planEnd: string;
}

interface Props {
  objectId: string;
  inspectionId: string;
  selectedIds: string[];
  disabled?: boolean;
}

export function GprPositionsSelector({ objectId, inspectionId, selectedIds, disabled }: Props) {
  const patch = usePatchInspection(objectId, inspectionId);

  // Получаем версии ГПР
  const { data: versions = [], isLoading: versionsLoading } = useQuery<GanttVersion[]>({
    queryKey: ['gantt-versions', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data as GanttVersion[];
    },
    enabled: !!objectId,
  });

  const currentVersion = versions[0];

  // Получаем задачи текущей версии ГПР
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<GanttTask[]>({
    queryKey: ['gantt-tasks', objectId, currentVersion?.id],
    queryFn: async () => {
      if (!currentVersion) return [];
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${currentVersion.id}/tasks`,
      );
      const json = await res.json();
      if (!json.success) return [];
      return json.data as GanttTask[];
    },
    enabled: !!currentVersion,
  });

  const handleToggle = (taskId: string, checked: boolean) => {
    if (disabled) return;
    const next = checked
      ? Array.from(new Set([...selectedIds, taskId]))
      : selectedIds.filter((id) => id !== taskId);
    patch.mutate({ ganttTaskIds: next });
  };

  if (versionsLoading || tasksLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!currentVersion || tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет активного ГПР или задач для привязки
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        ГПР: {currentVersion.name} — {tasks.length} позиций
      </p>
      <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border p-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <Checkbox
              id={`gpr-${task.id}`}
              checked={selectedIds.includes(task.id)}
              onCheckedChange={(checked) => handleToggle(task.id, !!checked)}
              disabled={disabled || patch.isPending}
            />
            <Label
              htmlFor={`gpr-${task.id}`}
              className="cursor-pointer text-sm font-normal leading-snug"
            >
              {task.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
