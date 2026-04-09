'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ReportBlockType, ReportStatus } from '@prisma/client';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type ReportBlock = {
  id: string;
  order: number;
  type: ReportBlockType;
  title: string;
  content: unknown;
  isAutoFilled: boolean;
  s3Keys: string[];
  createdAt: string;
  updatedAt: string;
};

export type ReportDetail = {
  id: string;
  number: number;
  name: string;
  status: ReportStatus;
  periodStart: string | null;
  periodEnd: string | null;
  pdfS3Key: string | null;
  xlsxS3Key: string | null;
  fileName: string | null;
  s3Keys: string[];
  approvalRouteId: string | null;
  author: { id: string; firstName: string; lastName: string } | null;
  category: { id: string; name: string } | null;
  template: { id: string; name: string } | null;
  blocks: ReportBlock[];
  createdAt: string;
  updatedAt: string;
};

// ─── Вспомогательные типы ─────────────────────────────────────────────────────

export type UpdateReportPayload = {
  name?: string;
  status?: ReportStatus;
  categoryId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type AddBlockPayload = {
  type: ReportBlockType;
  title: string;
  order: number;
};

export type UpdateBlockPayload = {
  blockId: string;
  title?: string;
  order?: number;
  content?: Record<string, unknown> | null;
};

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useReportCard(objectId: string, reportId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // ─── Запрос: карточка отчёта ──────────────────────────────────────────────
  const { data: report, isLoading } = useQuery<ReportDetail>({
    queryKey: ['report', objectId, reportId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/reports/${reportId}`);
      const json = await res.json() as { success: boolean; data: ReportDetail; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки отчёта');
      return json.data;
    },
    enabled: !!objectId && !!reportId,
  });

  // ─── Мутация: обновить мета-поля ──────────────────────────────────────────
  const updateReport = useMutation({
    mutationFn: async (payload: UpdateReportPayload) => {
      const res = await fetch(`/api/projects/${objectId}/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
      void qc.invalidateQueries({ queryKey: ['reports', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: удалить отчёт ───────────────────────────────────────────────
  const deleteReport = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/reports/${reportId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      toast({ title: 'Отчёт удалён' });
      void qc.invalidateQueries({ queryKey: ['reports', objectId] });
      router.push(`/objects/${objectId}/reports/list`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: добавить блок ───────────────────────────────────────────────
  const addBlock = useMutation({
    mutationFn: async (payload: AddBlockPayload) => {
      const res = await fetch(`/api/projects/${objectId}/reports/${reportId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления блока');
    },
    onSuccess: () => {
      toast({ title: 'Блок добавлен' });
      void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
      setAddBlockOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: обновить блок ───────────────────────────────────────────────
  const updateBlock = useMutation({
    mutationFn: async ({ blockId, ...payload }: UpdateBlockPayload) => {
      const res = await fetch(
        `/api/projects/${objectId}/reports/${reportId}/blocks/${blockId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления блока');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
      setEditBlockId(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: удалить блок ────────────────────────────────────────────────
  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/reports/${reportId}/blocks/${blockId}`,
        { method: 'DELETE' }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления блока');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Пересортировка блоков (drag-and-drop) ────────────────────────────────
  const reorderBlocks = async (reorderedBlocks: ReportBlock[]) => {
    // Определяем блоки у которых изменился order (по ID)
    const originalOrderById = new Map((report?.blocks ?? []).map((b) => [b.id, b.order]));
    const changed = reorderedBlocks.filter((b) => b.order !== originalOrderById.get(b.id));
    if (changed.length === 0) return;
    await Promise.all(
      changed.map((b) =>
        fetch(`/api/projects/${objectId}/reports/${reportId}/blocks/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: b.order }),
        })
      )
    );
    void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
  };

  // ─── Генерация PDF ────────────────────────────────────────────────────────
  const generatePdf = async () => {
    setIsPdfGenerating(true);
    try {
      const res = await fetch(
        `/api/projects/${objectId}/reports/${reportId}/generate-pdf`,
        { method: 'POST' }
      );
      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
      if (!json.success || !json.data?.url) {
        throw new Error(json.error ?? 'Ошибка генерации PDF');
      }
      window.open(json.data.url, '_blank');
      void qc.invalidateQueries({ queryKey: ['report', objectId, reportId] });
      toast({ title: 'PDF сформирован' });
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Ошибка генерации PDF',
        variant: 'destructive',
      });
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return {
    report,
    isLoading,
    updateReport,
    deleteReport,
    addBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    generatePdf,
    isPdfGenerating,
    addBlockOpen,
    setAddBlockOpen,
    editBlockId,
    setEditBlockId,
  };
}
