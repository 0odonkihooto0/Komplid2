'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface FinancialTableItem {
  id: string;
  name: string;
  contractId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTableDetail extends FinancialTableItem {
  columns: unknown;
  rows: unknown;
}

const base = (p: string, c: string) =>
  `/api/projects/${p}/contracts/${c}/financial-tables`;

/** Хук для работы со списком финансовых таблиц договора */
export function useFinancialTables(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['financial-tables', projectId, contractId];

  const { data: tables = [], isLoading } = useQuery<FinancialTableItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(base(projectId, contractId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  /** Создать новую финансовую таблицу */
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FinancialTableItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Таблица создана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Удалить финансовую таблицу */
  const deleteMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const res = await fetch(`${base(projectId, contractId)}/${tableId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Таблица удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { tables, isLoading, createMutation, deleteMutation };
}

/** Хук для работы с конкретной финансовой таблицей (полные данные с columns и rows) */
export function useFinancialTableDetail(
  projectId: string,
  contractId: string,
  tableId: string | null,
) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['financial-table-detail', tableId];

  const { data: table, isLoading } = useQuery<FinancialTableDetail>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${base(projectId, contractId)}/${tableId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!tableId,
  });

  /** Сохранить изменения таблицы (debounced PATCH из редактора) */
  const patchMutation = useMutation({
    mutationFn: async (data: { name?: string; columns?: unknown; rows?: unknown }) => {
      const res = await fetch(`${base(projectId, contractId)}/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FinancialTableDetail;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    },
  });

  /** Перезаполнить таблицу данными из ГПР (диаграммы Ганта) */
  const fillFromGprMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${base(projectId, contractId)}/${tableId}/fill-from-gpr`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FinancialTableDetail;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
      toast({ title: 'Таблица обновлена из ГПР' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка заполнения из ГПР', description: error.message, variant: 'destructive' });
    },
  });

  return { table, isLoading, patchMutation, fillFromGprMutation };
}
