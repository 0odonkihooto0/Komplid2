'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import type { ReferenceSchema } from '@/lib/references/types';

export interface ReferenceTableState {
  schema: ReferenceSchema;
  rows: Record<string, unknown>[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedIds: string[];
  columnVisibility: Record<string, boolean>;
  queryKey: unknown[];
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setSorting: (key: string, order: 'asc' | 'desc') => void;
  toggleColumnVisibility: (key: string) => void;
  toggleRowSelection: (id: string) => void;
  toggleAllSelection: () => void;
  clearSelection: () => void;
  deleteEntry: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
  isDeleting: boolean;
  exportTable: (mode: 'visible' | 'all-columns' | 'all-data', columns?: string[]) => void;
}

export function useReferenceTable(schema: ReferenceSchema): ReferenceTableState {
  const queryClient = useQueryClient();

  const [page, setPageState] = useState(1);
  // Иерархические справочники загружают все записи сразу,
  // кроме lazyLoad=true (большие справочники типа КСИ — серверная пагинация)
  const pageSize = (schema.hierarchical && !schema.lazyLoad) ? 500 : 50;
  const [search, setSearchState] = useState('');
  const [sortBy, setSortBy] = useState(schema.defaultSort ?? 'createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const storageKey = `ref-columns-${schema.slug}`;
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility, storageKey]);

  const setPage = useCallback((p: number) => setPageState(p), []);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    setPageState(1);
  }, []);

  const setSorting = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPageState(1);
  }, []);

  const toggleColumnVisibility = useCallback((key: string) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Для иерархических справочников без lazyLoad пагинация не используется — всегда страница 1
  const effectivePage = (schema.hierarchical && !schema.lazyLoad) ? 1 : page;
  const queryKey = ['references', schema.slug, effectivePage, pageSize, search, sortBy, sortOrder];

  const { data, isLoading } = useQuery<{
    data: Record<string, unknown>[];
    meta?: { total: number; page: number; pageSize: number; totalPages: number };
  }>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(effectivePage),
        limit: String(pageSize),
        sort: sortBy,
        order: sortOrder,
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/references/${schema.slug}?${sp}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error as string);
      return json as { data: Record<string, unknown>[]; meta?: { total: number; page: number; pageSize: number; totalPages: number } };
    },
  });

  const rows: Record<string, unknown>[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const toggleAllSelection = useCallback(() => {
    const allIds = rows.map((r) => r.id as string);
    setSelectedIds((prev) => (prev.length === allIds.length ? [] : allIds));
  }, [rows]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/references/${schema.slug}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error as string);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references', schema.slug] });
      toast({ title: 'Запись удалена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/references/${schema.slug}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error as string);
      return json.data as { deleted: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['references', schema.slug] });
      clearSelection();
      toast({ title: `Удалено ${result.deleted} записей` });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const exportTable = useCallback(
    (mode: 'visible' | 'all-columns' | 'all-data', columns?: string[]) => {
      fetch(`/api/references/${schema.slug}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, columns }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Ошибка экспорта');
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${schema.pluralName}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch((err: Error) => {
          toast({ title: 'Ошибка экспорта', description: err.message, variant: 'destructive' });
        });
    },
    [schema.slug, schema.pluralName]
  );

  return {
    schema,
    rows,
    isLoading,
    total,
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    selectedIds,
    columnVisibility,
    queryKey,
    setPage,
    setSearch,
    setSorting,
    toggleColumnVisibility,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
    deleteEntry: deleteMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    isDeleting: deleteMutation.isPending || bulkDeleteMutation.isPending,
    exportTable,
  };
}
