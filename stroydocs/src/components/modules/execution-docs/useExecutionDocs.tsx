'use client';

import { useQuery } from '@tanstack/react-query';
import type { ExecutionDocType, ExecutionDocStatus, IdCategory } from '@prisma/client';
import type { ExecutionDocRow } from './execution-docs-columns';

/** Параметры фильтрации таблицы ИД */
export interface ExecutionDocsFilters {
  types?: ExecutionDocType[];
  statuses?: ExecutionDocStatus[];
  idCategory?: IdCategory | null;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  authorId?: string | null;
}

export function useExecutionDocs(
  contractId: string,
  categoryId?: string | null,
  types?: ExecutionDocType[],
  filters?: ExecutionDocsFilters
) {
  const { data: docs = [], isLoading } = useQuery<ExecutionDocRow[]>({
    queryKey: ['execution-docs', contractId, categoryId ?? null, types, filters],
    queryFn: async () => {
      const url = new URL(`/api/contracts/${contractId}/execution-docs`, window.location.origin);
      if (categoryId) url.searchParams.set('categoryId', categoryId);

      // Тип: из prop types (фильтр вкладки) или из filters.types (пользовательский)
      const effectiveTypes = filters?.types && filters.types.length > 0 ? filters.types : types;
      if (effectiveTypes && effectiveTypes.length > 0) {
        url.searchParams.set('types', effectiveTypes.join(','));
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        url.searchParams.set('statuses', filters.statuses.join(','));
      }
      if (filters?.idCategory) url.searchParams.set('idCategory', filters.idCategory);
      if (filters?.dateFrom) url.searchParams.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) url.searchParams.set('dateTo', filters.dateTo);
      if (filters?.authorId) url.searchParams.set('authorId', filters.authorId);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (!json.success) return [];
      return json.data as ExecutionDocRow[];
    },
  });

  return { docs, isLoading };
}
