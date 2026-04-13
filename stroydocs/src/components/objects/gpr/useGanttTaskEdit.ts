'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useObjectContracts } from './useGanttScheduleHooks';
import type { GanttTaskItem, GanttTasksData } from '@/components/modules/gantt/ganttTypes';

function gprBase(objectId: string, versionId: string) {
  return `/api/projects/${objectId}/gantt-versions/${versionId}`;
}

/** Хук для работы с расширенной карточкой задачи ГПР */
export function useGanttTaskEdit(
  objectId: string,
  versionId: string,
  taskId: string,
  tasks: GanttTaskItem[],
) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { contracts, isLoading: contractsLoading } = useObjectContracts(objectId);

  // Список задач-родителей (исключая текущую задачу и её потомков)
  const parentOptions = tasks.filter(
    (t) => t.id !== taskId && t.level === 0,
  );

  /** Загрузить вложение в S3 */
  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${gprBase(objectId, versionId)}/tasks/${taskId}/attachments`,
        { method: 'POST', body: formData },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки файла');
      return json.data as { s3Key: string; attachmentS3Keys: string[] };
    },
    onSuccess: (result) => {
      // Обновляем кэш задач — вложения изменились
      qc.setQueryData<GanttTasksData>(['gantt-tasks-gpr', versionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId
              ? { ...t, attachmentS3Keys: result.attachmentS3Keys }
              : t,
          ),
        };
      });
      toast({ title: 'Файл загружен' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  /** Удалить вложение из S3 */
  const removeAttachment = useMutation({
    mutationFn: async (s3Key: string) => {
      const res = await fetch(
        `${gprBase(objectId, versionId)}/tasks/${taskId}/attachments?key=${encodeURIComponent(s3Key)}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления файла');
      return json.data as { attachmentS3Keys: string[] };
    },
    onSuccess: (result) => {
      qc.setQueryData<GanttTasksData>(['gantt-tasks-gpr', versionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId
              ? { ...t, attachmentS3Keys: result.attachmentS3Keys }
              : t,
          ),
        };
      });
      toast({ title: 'Файл удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    contracts,
    contractsLoading,
    parentOptions,
    uploadAttachment,
    removeAttachment,
  };
}
