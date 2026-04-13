'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface GanttChangeLogEntry {
  id: string;
  action: string;
  taskId: string | null;
  taskName: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ChangeLogFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
}

const PAGE_SIZE = 50;

export function useGanttChangeLog(
  objectId: string,
  versionId: string | null,
  enabled: boolean,
) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ChangeLogFilters>({
    search: '', dateFrom: '', dateTo: '',
  });

  // Сброс страницы при изменении фильтров
  useEffect(() => { setPage(1); }, [filters.search, filters.dateFrom, filters.dateTo]);

  const query = useQuery<{
    data: GanttChangeLogEntry[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>({
    queryKey: ['gantt-changelog', objectId, versionId, page, filters],
    queryFn: async () => {
      const url = new URL(
        `/api/objects/${objectId}/gantt-versions/${versionId}/changelog`,
        window.location.origin,
      );
      url.searchParams.set('take', String(PAGE_SIZE));
      url.searchParams.set('skip', String((page - 1) * PAGE_SIZE));
      if (filters.search) url.searchParams.set('search', filters.search);
      if (filters.dateFrom) url.searchParams.set('from', filters.dateFrom);
      if (filters.dateTo) url.searchParams.set('to', filters.dateTo);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки журнала');
      return json;
    },
    enabled: enabled && !!objectId && !!versionId,
  });

  return {
    entries: query.data?.data ?? [],
    total: query.data?.meta?.total ?? 0,
    totalPages: query.data?.meta?.totalPages ?? 0,
    page,
    setPage,
    filters,
    setFilters,
    isLoading: query.isLoading,
  };
}
