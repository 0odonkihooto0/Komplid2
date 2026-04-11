'use client';

import { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePlannerTasks,
  useDeletePlannerTask,
  type PlannerTask,
} from './usePlannerTasks';
import { usePlannerVersions } from './usePlannerVersions';
import { PlannerTaskTree } from './PlannerTaskTree';
import { CreatePlannerTaskDialog } from './CreatePlannerTaskDialog';

interface Props {
  projectId: string;
}

export function ProjectPlannerView({ projectId }: Props) {
  const { versions } = usePlannerVersions(projectId);
  // Текущая версия УП по умолчанию; если не найдена — первая в списке
  const currentVersion = versions.find((v) => v.isCurrent) ?? versions[0];

  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(
    undefined,
  );
  // Если пользователь не выбрал версию явно — используем текущую
  const effectiveVersionId = selectedVersionId ?? currentVersion?.id ?? undefined;

  const { tasks, isLoading } = usePlannerTasks(projectId, effectiveVersionId ?? null);
  const deleteMutation = useDeletePlannerTask(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<PlannerTask | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>(undefined);

  function handleCreateChild(parentId: string) {
    setDefaultParentId(parentId);
    setEditTask(null);
    setDialogOpen(true);
  }

  function handleEdit(task: PlannerTask) {
    setEditTask(task);
    setDefaultParentId(undefined);
    setDialogOpen(true);
  }

  function handleDelete(task: PlannerTask) {
    // Подтверждение перед удалением: подзадачи становятся корневыми
    if (confirm(`Удалить задачу «${task.title}»? Все подзадачи станут корневыми.`)) {
      deleteMutation.mutate(task.id);
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setEditTask(null);
      setDefaultParentId(undefined);
    }
  }

  function handleOpenCreate() {
    setEditTask(null);
    setDefaultParentId(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Панель управления: выбор версии и кнопка создания */}
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Версия УП:</span>
          <Select
            value={effectiveVersionId ?? ''}
            onValueChange={(v) => setSelectedVersionId(v || undefined)}
          >
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue placeholder="Все задачи" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все задачи</SelectItem>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                  {v.isCurrent ? ' (текущая)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Создать задачу
        </Button>
      </div>

      {/* Список задач */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg">
          <BookOpen className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Нет задач в планировщике</p>
          <p className="text-gray-400 text-sm mt-1">
            Создайте первую задачу для начала планирования
          </p>
          <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
            <Plus className="mr-1 h-4 w-4" /> Создать задачу
          </Button>
        </div>
      ) : (
        <PlannerTaskTree
          tasks={tasks}
          projectId={projectId}
          onEdit={handleEdit}
          onCreateChild={handleCreateChild}
          onDelete={handleDelete}
        />
      )}

      {/* Диалог создания / редактирования задачи */}
      <CreatePlannerTaskDialog
        open={dialogOpen || !!editTask}
        onOpenChange={handleDialogClose}
        projectId={projectId}
        versionId={effectiveVersionId ?? null}
        tasks={tasks}
        mode={editTask ? 'edit' : 'create'}
        initialTask={editTask}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
