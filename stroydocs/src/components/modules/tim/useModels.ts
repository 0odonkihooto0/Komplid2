'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { BimModelStage } from '@prisma/client';

// ─── Типы ───────────────────────────────────────────────────────────────────

export interface BimModelItem {
  id: string;
  name: string;
  status: 'PROCESSING' | 'READY' | 'ERROR';
  stage: BimModelStage | null;
  fileName: string;
  fileSize: number | null;
  ifcVersion: string | null;
  elementCount: number;
  isCurrent: boolean;
  comment: string | null;
  createdAt: string;
  section: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
  /** Сообщение об ошибке из metadata (если status=ERROR) */
  errorMessage?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number };
  error?: string;
}

interface PresignedUrlResponse {
  presignedUrl: string;
  s3Key: string;
}

interface CreateModelPayload {
  name: string;
  comment?: string | null;
  sectionId: string;
  stage?: BimModelStage | null;
  s3Key: string;
  fileName: string;
  fileSize?: number | null;
  metadata?: Record<string, unknown>;
}

export interface UploadModelInput {
  file: File;
  name: string;
  comment?: string | null;
  sectionId: string;
  stage?: BimModelStage | null;
  /** Источник модели: nanoCAD BIM, Renga, Pilot-BIM, Revit, ArchiCAD и т.д. */
  source?: string | null;
}

// ─── Утилиты ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, options);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error((json as { error?: string }).error ?? 'Ошибка запроса');
  return json;
}

// ─── Хуки ───────────────────────────────────────────────────────────────────

export function useModels(projectId: string, sectionId?: string | null) {
  const params = new URLSearchParams({ limit: '50' });
  if (sectionId) params.set('sectionId', sectionId);

  return useQuery<BimModelItem[]>({
    queryKey: ['bim-models', projectId, sectionId ?? null],
    queryFn: async () => {
      const json = await apiFetch<BimModelItem[]>(
        `/api/projects/${projectId}/bim/models?${params.toString()}`
      );
      return json.data;
    },
    staleTime: 15_000,
  });
}

export function useUploadModel(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, name, comment, sectionId, stage, source }: UploadModelInput) => {
      // Шаг 1 — получить presigned URL
      const presignedRes = await apiFetch<PresignedUrlResponse>(
        `/api/projects/${projectId}/bim/models/presigned-url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: 'application/octet-stream' }),
        }
      );

      const { presignedUrl, s3Key } = presignedRes.data;

      // Шаг 2 — загрузить файл напрямую в S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!uploadRes.ok) throw new Error('Ошибка загрузки файла в S3');

      // Шаг 3 — создать запись модели
      const payload: CreateModelPayload = {
        name,
        comment: comment ?? null,
        sectionId,
        stage: stage ?? null,
        s3Key,
        fileName: file.name,
        fileSize: file.size,
        metadata: source ? { source } : undefined,
      };

      const modelRes = await apiFetch<BimModelItem>(
        `/api/projects/${projectId}/bim/models`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      return modelRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-models', projectId] });
      toast({ title: 'Модель загружена', description: 'Парсинг IFC запущен в фоне' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteModel(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modelId: string) => {
      const res = await fetch(`/api/projects/${projectId}/bim/models/${modelId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-models', projectId] });
      toast({ title: 'Модель удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
