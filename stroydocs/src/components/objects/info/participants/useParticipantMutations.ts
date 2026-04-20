'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { AddParticipantInput, AddRoleInput, CopyParticipantInput } from '@/lib/validations/participants';

const QUERY_KEY = (projectId: string) => ['object-participants-v2', projectId];

/**
 * Хук мутаций для вкладки «Участники».
 * Разделён от основного хука чтобы не превышать лимит ~150 строк на файл.
 */
export function useParticipantMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY(projectId) });

  // Добавить участника (юрлицо или физлицо)
  const addParticipantMutation = useMutation({
    mutationFn: async (data: AddParticipantInput) => {
      const res = await fetch(`/api/projects/${projectId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
      toast({ title: 'Участник добавлен' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Добавить роль участнику
  const addRoleMutation = useMutation({
    mutationFn: async ({ participantId, data }: { participantId: string; data: AddRoleInput }) => {
      const res = await fetch(`/api/projects/${projectId}/participants/${participantId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления роли');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Роль добавлена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удалить роль
  const deleteRoleMutation = useMutation({
    mutationFn: async ({ participantId, roleId }: { participantId: string; roleId: string }) => {
      const res = await fetch(
        `/api/projects/${projectId}/participants/${participantId}/roles/${roleId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления роли');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Роль удалена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удалить участника
  const deleteParticipantMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'org' | 'person' }) => {
      const res = await fetch(
        `/api/projects/${projectId}/participants/${id}?type=${type}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
      toast({ title: 'Участник удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Копировать участника в другой объект
  const copyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CopyParticipantInput }) => {
      const res = await fetch(`/api/projects/${projectId}/participants/${id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка копирования');
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Участник скопирован в объект' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Добавить документ о назначении (FormData)
  const addAppointmentMutation = useMutation({
    mutationFn: async ({ personId, formData }: { personId: string; formData: FormData }) => {
      const res = await fetch(
        `/api/projects/${projectId}/participants/${personId}/appointment`,
        { method: 'POST', body: formData }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания назначения');
      return json.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Документ о назначении добавлен' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    addParticipantMutation,
    addRoleMutation,
    deleteRoleMutation,
    deleteParticipantMutation,
    copyMutation,
    addAppointmentMutation,
  };
}
