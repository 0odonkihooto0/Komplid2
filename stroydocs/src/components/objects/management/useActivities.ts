'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// === Типы ===

export interface ActivityCategory {
  id:        string;
  name:      string;
  order:     number;
  isSystem:  boolean;
  isHidden:  boolean;
  parentId:  string | null;
  projectId: string;
  createdAt: string;
}

export interface ActivityDocument {
  id:                string;
  number:            string | null;
  date:              string | null;
  name:              string;
  type:              string | null;
  status:            string;
  version:           number;
  activeIssuesCount: number;
  categoryId:        string;
  projectId:         string;
  authorId:          string;
  createdAt:         string;
  updatedAt:         string;
  category: { id: string; name: string };
  author:   { id: string; firstName: string; lastName: string };
}

export interface CreateCategoryInput {
  name:     string;
  order?:   number;
  parentId?: string;
}

export interface CreateDocumentInput {
  categoryId: string;
  name:       string;
  type?:      string;
  number?:    string;
  date?:      string;
  status?:    string;
}

// === Хуки категорий ===

export function useActivityCategories(objectId: string, showHidden = false) {
  return useQuery<ActivityCategory[]>({
    queryKey: ['activity-categories', objectId, showHidden],
    queryFn: async () => {
      const url = `/api/objects/${objectId}/activity-categories${showHidden ? '?showHidden=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки категорий');
      const json = await res.json();
      return json.data as ActivityCategory[];
    },
  });
}

export function useCreateActivityCategory(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const res = await fetch(`/api/objects/${objectId}/activity-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Ошибка создания категории');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activity-categories', objectId] });
    },
  });
}

export function useConfigureCategories(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const res = await fetch(`/api/objects/${objectId}/activity-categories/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds }),
      });
      if (!res.ok) throw new Error('Ошибка настройки категорий');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activity-categories', objectId] });
    },
  });
}

// === Хуки документов ===

export function useActivityDocuments(objectId: string, categoryId?: string) {
  return useQuery<ActivityDocument[]>({
    queryKey: ['activity-documents', objectId, categoryId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (categoryId) params.set('categoryId', categoryId);
      const res = await fetch(`/api/objects/${objectId}/activity-documents?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки документов');
      const json = await res.json();
      return json.data as ActivityDocument[];
    },
  });
}

export function useCreateActivityDocument(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      const res = await fetch(`/api/objects/${objectId}/activity-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Ошибка создания документа');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activity-documents', objectId] });
    },
  });
}

export function useDeleteActivityDocument(objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/objects/${objectId}/activity-documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка удаления документа');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activity-documents', objectId] });
    },
  });
}
