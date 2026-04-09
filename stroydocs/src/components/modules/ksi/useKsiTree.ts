'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface KsiNode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  tableCode?: string | null;
  externalId?: string | null;
  _count?: { children: number };
  parent?: { code: string; name: string } | null;
  _source?: 'local' | 'external';
}

/** Загрузка узлов КСИ (корневые или дочерние, с опциональным фильтром по таблице) */
async function fetchKsiNodes(
  parentId?: string | null,
  tableCode?: string | null
): Promise<KsiNode[]> {
  const params = new URLSearchParams();
  if (parentId) params.set('parentId', parentId);
  if (tableCode) params.set('tableCode', tableCode);
  const url = `/api/ksi${params.size > 0 ? `?${params}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.success ? json.data : [];
}

async function searchKsiNodes(
  search: string,
  tableCode?: string | null
): Promise<KsiNode[]> {
  const params = new URLSearchParams({ search });
  if (tableCode) params.set('tableCode', tableCode);
  const res = await fetch(`/api/ksi?${params}`);
  const json = await res.json();
  return json.success ? json.data : [];
}

export function useKsiTree(search: string, tableCode?: string | null) {
  const [expandedNodes, setExpandedNodes] = useState<Map<string, KsiNode[]>>(new Map());

  // Корневые узлы (сбрасываем кэш при смене таблицы)
  const { data: nodes = [], isLoading: rootLoading } = useQuery<KsiNode[]>({
    queryKey: ['ksi', 'root', tableCode ?? 'all'],
    queryFn: () => fetchKsiNodes(null, tableCode),
  });

  // Результаты поиска
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<KsiNode[]>({
    queryKey: ['ksi', 'search', search, tableCode ?? 'all'],
    queryFn: () => searchKsiNodes(search, tableCode),
    enabled: search.length >= 2,
  });

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Map(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      }
      return next;
    });
  }, []);

  const loadChildren = useCallback(
    async (nodeId: string) => {
      // Если уже загружены — не загружаем повторно
      if (expandedNodes.has(nodeId)) return;

      const children = await fetchKsiNodes(nodeId, tableCode);
      setExpandedNodes((prev) => {
        const next = new Map(prev);
        next.set(nodeId, children);
        return next;
      });
    },
    [expandedNodes, tableCode]
  );

  // При смене таблицы сбрасываем раскрытые узлы
  const resetExpanded = useCallback(() => {
    setExpandedNodes(new Map());
  }, []);

  return {
    nodes,
    searchResults,
    isLoading: search.length >= 2 ? searchLoading : rootLoading,
    expandedNodes,
    toggleExpand,
    loadChildren,
    resetExpanded,
  };
}
