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
  entityType: 'GanttTask' | 'ExecutionDoc' | 'Ks2Act' | 'Defect';
  entityId: string;
  createdAt: string;
  /** Читаемое имя сущности (номер + название или только название) */
  entityLabel?: string;
  /** Статус сущности для отображения Badge */
  entityStatus?: string;
  /** Присутствует только при запросах с include element (allGprLinks, entityId-фильтр) */
  element?: { id: string; ifcGuid: string; ifcType: string; name: string | null };
}

/** Версия ГПР (сводные данные из /api/projects/[id]/gantt-versions) */
export interface GanttVersionSummary {
  id: string;
  name: string;
  isBaseline: boolean;
  isActive: boolean;
  planStart: string | null;
  planEnd: string | null;
  taskCount: number;
}

/** Задача ГПР для просмотра в TIM (подмножество полей GanttTask) */
export interface GanttTaskViewer {
  id: string;
  name: string;
  level: number;
  sortOrder: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ON_HOLD';
  planStart: string;
  planEnd: string;
  factEnd: string | null;
  progress: number;
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
  entityType: 'GanttTask' | 'ExecutionDoc' | 'Ks2Act' | 'Defect';
  entityId: string;
}

/** Документ (ExecutionDoc или Ks2Act) для диалога поиска */
export interface DocSearchItem {
  id: string;
  entityType: 'ExecutionDoc' | 'Ks2Act';
  number: string | null;
  title: string | null;
  status: string;
  contractId: string;
}

/** Дефект для диалога поиска */
export interface DefectSearchItem {
  id: string;
  title: string;
  status: string;
  category: string | null;
}

/** Данные для создания нового замечания и привязки к ТИМ-элементу */
export interface CreateDefectPayload {
  elementId: string;
  modelId: string;
  title: string;
  description?: string;
  category?: string;
  normativeRef?: string;
  deadline?: string;
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
      // Инвалидируем кэш всех связей модели для обновления цветов Timeline
      queryClient.invalidateQueries({ queryKey: ['all-gpr-links', projectId] });
      toast({ title: 'Привязка создана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}

// ─── Upload version ──────────────────────────────────────────────────────────

export interface UploadVersionInput {
  file: File;
  name: string;
  comment?: string | null;
  setAsCurrent: boolean;
}

interface PresignedUrlResponse {
  presignedUrl: string;
  s3Key: string;
}

/** Загрузить новую версию существующей модели */
export function useUploadVersion(projectId: string, modelId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, name, comment, setAsCurrent }: UploadVersionInput) => {
      // Шаг 1 — получить presigned URL
      const presignedRes = await apiFetch<PresignedUrlResponse>(
        `/api/projects/${projectId}/bim/models/presigned-url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: 'application/octet-stream' }),
        }
      );

      // Шаг 2 — загрузить файл в S3
      const uploadRes = await fetch(presignedRes.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!uploadRes.ok) throw new Error('Ошибка загрузки файла в S3');

      // Шаг 3 — создать запись версии
      return apiFetch<{ id: string }>(
        `/api/projects/${projectId}/bim/models/${modelId}/upload-version`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            comment: comment ?? null,
            s3Key: presignedRes.s3Key,
            fileName: file.name,
            fileSize: file.size,
            setAsCurrent,
          }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-model-detail', projectId, modelId] });
      toast({ title: 'Версия загружена', description: 'Новая версия модели добавлена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    },
  });
}

// ─── ГПР хуки для TIM-вьюера ────────────────────────────────────────────────

/** Версии ГПР текущего объекта (для Select в GprLinkPanel и динамических дат Timeline) */
export function useGanttVersionsForViewer(projectId: string) {
  return useQuery<GanttVersionSummary[]>({
    queryKey: ['gantt-versions-viewer', projectId],
    queryFn: () => apiFetch<GanttVersionSummary[]>(`/api/projects/${projectId}/gantt-versions`),
    staleTime: 60_000,
  });
}

/** Задачи выбранной версии ГПР (для списка позиций в GprLinkPanel) */
export function useGanttTasksForViewer(projectId: string, versionId: string | null) {
  return useQuery<{ tasks: GanttTaskViewer[]; dependencies: unknown[] }>({
    queryKey: ['gantt-tasks-viewer', projectId, versionId],
    enabled: !!versionId,
    queryFn: () =>
      apiFetch<{ tasks: GanttTaskViewer[]; dependencies: unknown[] }>(
        `/api/projects/${projectId}/gantt-versions/${versionId}/tasks`
      ),
    staleTime: 30_000,
  });
}

/** Все GPR-связи модели (для цветовой индикации по временной шкале) */
export function useAllGprLinks(projectId: string, modelId: string) {
  return useQuery<BimElementLink[]>({
    queryKey: ['all-gpr-links', projectId, modelId],
    queryFn: () =>
      apiFetch<BimElementLink[]>(
        `/api/projects/${projectId}/bim/links?entityType=GanttTask&modelId=${modelId}`
      ),
    staleTime: 30_000,
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
      // Инвалидируем кэш всех связей модели для обновления цветов Timeline
      queryClient.invalidateQueries({ queryKey: ['all-gpr-links', projectId] });
      toast({ title: 'Привязка удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}

// ─── Поиск документов для диалога привязки ─────────────────────────────────

/** Поиск ExecutionDoc и Ks2Act по объекту (для диалога добавления связи) */
export function useSearchDocs(projectId: string, search: string, enabled: boolean) {
  return useQuery<DocSearchItem[]>({
    queryKey: ['bim-search-docs', projectId, search],
    queryFn: () =>
      apiFetch<DocSearchItem[]>(
        `/api/projects/${projectId}/execution-docs?search=${encodeURIComponent(search)}&limit=50`
      ),
    enabled,
    staleTime: 15_000,
  });
}

/** Поиск Defect по объекту (для диалога добавления связи).
 *  API дефектов не поддерживает text-search — загружаем все, фильтруем на клиенте. */
export function useSearchDefects(projectId: string, enabled: boolean) {
  return useQuery<{ data: DefectSearchItem[] }>({
    queryKey: ['bim-search-defects', projectId],
    queryFn: () =>
      apiFetch<{ data: DefectSearchItem[] }>(
        `/api/projects/${projectId}/defects?limit=50`
      ),
    enabled,
    staleTime: 30_000,
  });
}

/** Создать новое замечание (Defect) и сразу привязать к ТИМ-элементу */
export function useCreateDefectAndLink(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      elementId, modelId, title, description, category, normativeRef, deadline,
    }: CreateDefectPayload) => {
      // Шаг 1: создать Defect
      const defect = await apiFetch<{ id: string }>(
        `/api/projects/${projectId}/defects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, category, normativeRef, deadline }),
        }
      );
      // Шаг 2: создать привязку к ТИМ-элементу
      await apiFetch<{ id: string }>(
        `/api/projects/${projectId}/bim/links`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elementId, modelId, entityType: 'Defect', entityId: defect.id }),
        }
      );
      return defect;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['bim-element-detail', projectId, variables.modelId, variables.elementId],
      });
      queryClient.invalidateQueries({ queryKey: ['bim-issues', projectId] });
      toast({ title: 'Замечание создано и привязано к элементу' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
