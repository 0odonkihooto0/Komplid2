'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ApiResponse } from '@/types/api';
import type { JournalDetail, JournalRequisites } from './journal-constants';

// === Типы ответа участников объекта ===

interface OrgParticipant {
  id: string;
  organization: { id: string; name: string; inn: string | null; sroNumber: string | null };
  roles: { id: string; roleName: string }[];
}

interface PersonParticipant {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  organization: { id: string; name: string } | null;
  roles: { id: string; roleName: string }[];
}

export interface ParticipantsData {
  orgs: OrgParticipant[];
  persons: PersonParticipant[];
}

// === Форма реквизитов ===

export interface RequisitesForm {
  customer: string;       // "org:<id>" | "person:<id>" | ""
  generalContractor: string;
  constructionControl: string;
  authorSupervision: string;
  stateSupervision: string;
  startDate: string;      // ISO date string "YYYY-MM-DD" | ""
  endDate: string;
}

function journalToForm(journal: JournalDetail): RequisitesForm {
  const r = journal.requisites;

  function entryToValue(key: keyof JournalRequisites): string {
    const entry = r?.[key];
    if (!entry) return '';
    if (entry.orgId) return `org:${entry.orgId}`;
    if (entry.personId) return `person:${entry.personId}`;
    return '';
  }

  return {
    customer: entryToValue('customer'),
    generalContractor: entryToValue('generalContractor'),
    constructionControl: entryToValue('constructionControl'),
    authorSupervision: entryToValue('authorSupervision'),
    stateSupervision: entryToValue('stateSupervision'),
    startDate: journal.startDate ? journal.startDate.slice(0, 10) : '',
    endDate: journal.endDate ? journal.endDate.slice(0, 10) : '',
  };
}

function formToPayload(
  form: RequisitesForm,
  participants: ParticipantsData
): { requisites: JournalRequisites; startDate: string | null; endDate: string | null } {
  function valueToEntry(value: string): JournalRequisites[keyof JournalRequisites] {
    if (!value) return undefined;
    if (value.startsWith('org:')) {
      const orgId = value.slice(4);
      const org = participants.orgs.find((o) => o.id === orgId);
      return org ? { orgId, name: org.organization.name } : undefined;
    }
    if (value.startsWith('person:')) {
      const personId = value.slice(7);
      const person = participants.persons.find((p) => p.id === personId);
      if (!person) return undefined;
      const fullName = [person.lastName, person.firstName, person.middleName]
        .filter(Boolean)
        .join(' ');
      return {
        personId,
        name: person.organization ? `${fullName} (${person.organization.name})` : fullName,
      };
    }
    return undefined;
  }

  return {
    requisites: {
      customer: valueToEntry(form.customer),
      generalContractor: valueToEntry(form.generalContractor),
      constructionControl: valueToEntry(form.constructionControl),
      authorSupervision: valueToEntry(form.authorSupervision),
      stateSupervision: valueToEntry(form.stateSupervision),
    },
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
  };
}

export function useJournalRequisites(objectId: string, journalId: string, journal: JournalDetail) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseUrl = `/api/projects/${objectId}/journals/${journalId}`;

  // Форма инициализируется из текущих данных журнала
  const [form, setForm] = useState<RequisitesForm>(() => journalToForm(journal));

  // Синхронизируем форму при обновлении журнала извне (инвалидация кэша)
  useEffect(() => {
    setForm(journalToForm(journal));
  }, [journal.requisites, journal.startDate, journal.endDate]);

  // Загрузка участников объекта
  const { data: participants, isLoading: isParticipantsLoading } = useQuery<ParticipantsData>({
    queryKey: ['participants', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/participants`);
      if (!res.ok) throw new Error('Ошибка загрузки участников');
      const json: ApiResponse<ParticipantsData> = await res.json();
      if (!json.success) throw new Error('Ошибка загрузки участников');
      return json.data;
    },
    enabled: !!objectId,
  });

  // Мутация: сохранение реквизитов
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form, participants ?? { orgs: [], persons: [] });
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка сохранения');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Реквизиты сохранены' });
      queryClient.invalidateQueries({ queryKey: ['journal', objectId, journalId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Мутация: автозаполнение реквизитов из участников объекта
  const fillMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/fill-requisites`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка автозаполнения');
      }
      const json: ApiResponse<{ requisites: JournalRequisites }> = await res.json();
      if (!json.success) throw new Error('Ошибка автозаполнения');
      return json.data.requisites;
    },
    onSuccess: (requisites) => {
      // Подставляем результаты в форму без сохранения в БД
      setForm((prev) => {
        function entryToValue(key: keyof JournalRequisites): string {
          const entry = requisites[key];
          if (!entry) return prev[key as keyof RequisitesForm] as string;
          if (entry.orgId) return `org:${entry.orgId}`;
          if (entry.personId) return `person:${entry.personId}`;
          return '';
        }
        return {
          ...prev,
          customer: entryToValue('customer'),
          generalContractor: entryToValue('generalContractor'),
          constructionControl: entryToValue('constructionControl'),
          authorSupervision: entryToValue('authorSupervision'),
          stateSupervision: entryToValue('stateSupervision'),
        };
      });
      toast({ title: 'Реквизиты заполнены. Нажмите «Сохранить изменения».' });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  function setField<K extends keyof RequisitesForm>(key: K, value: RequisitesForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return {
    form,
    setField,
    participants: participants ?? { orgs: [], persons: [] },
    isParticipantsLoading,
    saveMutation,
    fillMutation,
  };
}
