'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ParticipantsData, FilterState } from './types';
import { useParticipantMutations } from './useParticipantMutations';

export { useParticipantMutations };

/**
 * Основной хук данных вкладки «Участники».
 * Загружает список юрлиц и физлиц, управляет фильтрами и состоянием диалогов.
 */
export function useParticipants(projectId: string) {
  const [filter, setFilter] = useState<FilterState>({ search: '', role: '' });

  // Состояние диалогов (какой открыт и для какого участника)
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'org' | 'person'>('org');
  const [copyTarget, setCopyTarget] = useState<{
    id: string;
    type: 'org' | 'person';
  } | null>(null);
  const [appointmentPersonId, setAppointmentPersonId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<ParticipantsData>({
    queryKey: ['object-participants-v2', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/participants`);
      const json = await res.json().catch(() => ({ success: false, error: 'Ошибка сети' }));
      if (!json.success) throw new Error(json.error);
      return json.data as ParticipantsData;
    },
    enabled: !!projectId,
  });

  const mutations = useParticipantMutations(projectId);

  // Клиентская фильтрация юрлиц
  const filteredOrgs = useMemo(
    () =>
      (data?.orgs ?? []).filter((o) => {
        const matchRole = !filter.role || o.roles.some((r) => r.roleName === filter.role);
        const matchSearch =
          !filter.search ||
          o.organization.name.toLowerCase().includes(filter.search.toLowerCase()) ||
          o.organization.inn.includes(filter.search);
        return matchRole && matchSearch;
      }),
    [data?.orgs, filter]
  );

  // Клиентская фильтрация физлиц
  const filteredPersons = useMemo(
    () =>
      (data?.persons ?? []).filter((p) => {
        const matchRole = !filter.role || p.roles.some((r) => r.roleName === filter.role);
        const fullName = `${p.lastName} ${p.firstName} ${p.middleName ?? ''}`.toLowerCase();
        const matchSearch = !filter.search || fullName.includes(filter.search.toLowerCase());
        return matchRole && matchSearch;
      }),
    [data?.persons, filter]
  );

  const openAddOrg = () => {
    setAddDialogType('org');
    setAddDialogOpen(true);
  };

  const openAddPerson = () => {
    setAddDialogType('person');
    setAddDialogOpen(true);
  };

  return {
    isLoading,
    isError,
    filteredOrgs,
    filteredPersons,
    filter,
    setFilter,
    // Диалог добавления
    addDialogOpen,
    addDialogType,
    setAddDialogOpen,
    openAddOrg,
    openAddPerson,
    // Диалог копирования
    copyTarget,
    setCopyTarget,
    // Диалог назначения
    appointmentPersonId,
    setAppointmentPersonId,
    // Мутации
    ...mutations,
  };
}
