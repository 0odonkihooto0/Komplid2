'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { ProjectRole, ProjectMemberPolicy } from '@prisma/client';

export interface ProjectMemberRow {
  id: string;
  projectId: string;
  workspaceMemberId: string;
  projectRole: ProjectRole;
  assignedAt: string;
  notes: string | null;
  workspaceRole: string;
  specialization: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface WsMemberRow {
  workspaceMemberId: string;
  role: string;
  specialization: string | null;
  title: string | null;
  isAssigned: boolean;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface TeamData {
  policy: ProjectMemberPolicy;
  assigned: ProjectMemberRow[];
  allWorkspaceMembers: WsMemberRow[];
}

export function useProjectTeam(objectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['project-team', objectId];

  const { data, isLoading } = useQuery<TeamData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/members`);
      const json = (await res.json()) as { success: boolean; data: TeamData; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки команды');
      return json.data;
    },
  });

  // Изменение политики доступа
  const policyMutation = useMutation({
    mutationFn: async (memberPolicy: ProjectMemberPolicy) => {
      const res = await fetch(`/api/projects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberPolicy }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Политика доступа обновлена' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Назначение члена
  const assignMutation = useMutation({
    mutationFn: async (data: { workspaceMemberId: string; projectRole: ProjectRole; notes?: string }) => {
      const res = await fetch(`/api/projects/${objectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Участник назначен на объект' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Изменение роли
  const updateMutation = useMutation({
    mutationFn: async ({ memberId, projectRole }: { memberId: string; projectRole: ProjectRole }) => {
      const res = await fetch(`/api/projects/${objectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRole }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Роль участника обновлена' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Снятие с проекта
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/projects/${objectId}/members/${memberId}`, { method: 'DELETE' });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Участник снят с объекта' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const [assignOpen, setAssignOpen] = useState(false);

  return {
    policy: data?.policy ?? 'WORKSPACE_WIDE',
    assigned: data?.assigned ?? [],
    allWorkspaceMembers: data?.allWorkspaceMembers ?? [],
    isLoading,
    assignOpen,
    setAssignOpen,
    changePolicy: policyMutation.mutate,
    isPolicyChanging: policyMutation.isPending,
    assignMember: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
    updateMember: updateMutation.mutate,
    removeMember: removeMutation.mutate,
  };
}
