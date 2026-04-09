'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type BlockDefinition = {
  order: number;
  type: string;
  title: string;
};

export type ReportTemplateItem = {
  id: string;
  name: string;
  description: string | null;
  blockDefinitions: BlockDefinition[];
  isSystem: boolean;
  organizationId: string | null;
  createdAt: string;
  _count: { reports: number };
};

export type CreateTemplatePayload = {
  name: string;
  description?: string;
  blockDefinitions: BlockDefinition[];
};

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useTemplates() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  // reportId и блоки для «сохранить как шаблон»
  const [saveAsBlocks, setSaveAsBlocks] = useState<BlockDefinition[]>([]);
  const [saveAsDefaultName, setSaveAsDefaultName] = useState('');

  // ─── Запрос: список шаблонов ───────────────────────────────────────────────
  const {
    data: templatesData,
    isLoading: templatesLoading,
  } = useQuery<{ data: ReportTemplateItem[]; total: number; page: number; limit: number }>({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const res = await fetch('/api/report-templates');
      const json = await res.json() as {
        success: boolean;
        data: { data: ReportTemplateItem[]; total: number; page: number; limit: number };
      };
      if (!json.success) throw new Error('Ошибка загрузки шаблонов');
      return json.data;
    },
  });

  const templates = templatesData?.data ?? [];
  const systemTemplates = templates.filter((t) => t.isSystem);
  const orgTemplates = templates.filter((t) => !t.isSystem);

  // ─── Мутация: создать шаблон ──────────────────────────────────────────────
  const createTemplate = useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const res = await fetch('/api/report-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; data: ReportTemplateItem; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания шаблона');
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Шаблон создан' });
      void qc.invalidateQueries({ queryKey: ['report-templates'] });
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: удалить шаблон ──────────────────────────────────────────────
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/report-templates/${templateId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления шаблона');
    },
    onSuccess: () => {
      toast({ title: 'Шаблон удалён' });
      void qc.invalidateQueries({ queryKey: ['report-templates'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Открыть диалог «Сохранить как шаблон» ────────────────────────────────
  function openSaveAs(blocks: BlockDefinition[], reportName: string) {
    setSaveAsBlocks(blocks);
    setSaveAsDefaultName(reportName);
    setSaveAsOpen(true);
  }

  return {
    // Шаблоны
    systemTemplates,
    orgTemplates,
    templatesLoading,

    // Диалоги
    createOpen,
    setCreateOpen,
    saveAsOpen,
    setSaveAsOpen,
    saveAsBlocks,
    saveAsDefaultName,
    openSaveAs,

    // Мутации
    createTemplate,
    deleteTemplate,
  };
}
