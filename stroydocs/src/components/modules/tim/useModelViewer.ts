'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { BimModelStage, BimModelStatus } from '@prisma/client';

// ─── Типы ───────────────────────────────────────────────────────────────────

export interface BimModelVersion {
  id: string;
  version: number;
  name: string;
  comment: string | null;
  s3Key: string;
  fileName: string;
  fileSize: number | null;
  isCurrent: boolean;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
}

export interface BimModelDetail {
  id: string;
  name: string;
  status: BimModelStatus;
  stage: BimModelStage | null;
  s3Key: string;
  fileName: string;
  fileSize: number | null;
  ifcVersion: string | null;
  elementCount: number;
  isCurrent: boolean;
  comment: string | null;
  createdAt: string;
  /** Presigned URL для скачивания IFC-файла (TTL: 1 час) */
  downloadUrl: string;
  section: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
  versions: BimModelVersion[];
}

export interface BimElementLink {
  id: string;
  entityType: 'GanttTask' | 'ExecutionDoc' | 'Defect';
  entityId: string;
  createdAt: string;
}

export interface BimElementDetail {
  id: string;
  ifcGuid: string;
  ifcType: string;
  name: string | null;
  description: string | null;
  layer: string | null;
  level: string | null;
  /** IFC PropertySets в формате { [psetName]: { [propName]: value } } */
  properties: Record<string, Record<string, unknown>> | null;
  links: BimElementLink[];
}

export interface CreateLinkPayload {
  elementId: string;
  modelId: string;
  entityType: 'GanttTask' | 'ExecutionDoc' | 'Defect';
  entityId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ─── Утилита ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Ошибка запроса');
  return json.data;
}

// ─── Хуки ───────────────────────────────────────────────────────────────────

/** Детальные данные модели + downloadUrl */
export function useModelDetail(projectId: string, modelId: string) {
  return useQuery<BimModelDetail>({
    queryKey: ['bim-model-detail', projectId, modelId],
    queryFn: () =>
      apiFetch<BimModelDetail>(
        `/api/projects/${projectId}/bim/models/${modelId}`
      ),
    staleTime: 55 * 60 * 1000, // presigned URL живёт 1 час — обновляем за 5 минут до истечения
    retry: 1,
  });
}

/** Поиск элемента по ifcGuid (возвращает id + базовые поля) */
export function useElementByGuid(
  projectId: string,
  modelId: string,
  ifcGuid: string | null
) {
  return useQuery<{ id: string; ifcGuid: string; ifcType: string; name: string | null }>({
    queryKey: ['bim-element-by-guid', projectId, modelId, ifcGuid],
    queryFn: async () => {
      const list = await apiFetch<Array<{ id: string; ifcGuid: string; ifcType: string; name: string | null }>>(
        `/api/projects/${projectId}/bim/models/${modelId}/elements?ifcGuid=${ifcGuid}`
      );
      if (!Array.isArray(list) || list.length === 0) throw new Error('Элемент не найден');
      return list[0];
    },
    enabled: !!ifcGuid,
    staleTime: 60_000,
  });
}

/** Данные конкретного элемента по его DB-id */
export function useElementDetail(
  projectId: string,
  modelId: string,
  elementId: string | null
) {
  return useQuery<BimElementDetail>({
    queryKey: ['bim-element-detail', projectId, modelId, elementId],
    queryFn: () =>
      apiFetch<BimElementDetail>(
        `/api/projects/${projectId}/bim/models/${modelId}/elements/${elementId}`
      ),
    enabled: !!elementId,
    staleTime: 30_000,
  });
}

/** Создать привязку элемент → сущность (GanttTask / ExecutionDoc / Defect) */
export function useCreateLink(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateLinkPayload) =>
      apiFetch<{ id: string }>(
        `/api/projects/${projectId}/bim/links`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['bim-element-detail', projectId, variables.modelId, variables.elementId],
      });
      toast({ title: 'Привязка создана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}

/** Удалить привязку по linkId */
export function useDeleteLink(projectId: string, modelId: string, elementId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (linkId: string) =>
      apiFetch<{ id: string }>(
        `/api/projects/${projectId}/bim/links/${linkId}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['bim-element-detail', projectId, modelId, elementId],
      });
      toast({ title: 'Привязка удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
