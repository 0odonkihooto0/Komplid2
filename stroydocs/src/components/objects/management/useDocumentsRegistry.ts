'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DocumentCategory, RegistryDocument } from './documents-registry.types';

export type { DocumentCategory, RegistryDocument };

interface UseDocumentsRegistryResult {
  documents: RegistryDocument[];
  isLoading: boolean;
  total: number;
  page: number;
  setPage: (p: number) => void;
  selectedCategory: DocumentCategory;
  setSelectedCategory: (c: DocumentCategory) => void;
}

export function useDocumentsRegistry(objectId: string): UseDocumentsRegistryResult {
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['all-documents', objectId, selectedCategory, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: selectedCategory,
        page: String(page),
        limit: '50',
      });
      const res = await fetch(`/api/projects/${objectId}/all-documents?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      return json;
    },
  });

  const handleSetCategory = (c: DocumentCategory) => {
    setSelectedCategory(c);
    setPage(1);
  };

  return {
    documents: data?.data ?? [],
    isLoading,
    total: data?.meta?.total ?? 0,
    page,
    setPage,
    selectedCategory,
    setSelectedCategory: handleSetCategory,
  };
}
