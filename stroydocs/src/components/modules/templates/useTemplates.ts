'use client';

import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface DocumentTemplateItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  version: string;
  format: string;
  localPath: string | null;
  isPublic: boolean;
  fileExists: boolean;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  KS2: 'КС-2',
  KS3: 'КС-3',
  AVK: 'АВК',
  ZHVK: 'ЖВК',
  TECH_READINESS: 'Акт тех. готовности',
  OTHER: 'Прочее',
};

export function useTemplates(category?: string) {
  const { toast } = useToast();

  const url = category
    ? `/api/templates?category=${category}`
    : '/api/templates';

  const { data: templates = [], isLoading } = useQuery<DocumentTemplateItem[]>({
    queryKey: ['templates', category],
    queryFn: async () => {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  /** Скачать шаблон .docx */
  const downloadTemplate = async (templateId: string, templateName: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/download`);
      if (!res.ok) {
        toast({ title: 'Ошибка скачивания', variant: 'destructive' });
        return;
      }
      const blob = await res.blob();
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url2;
      a.download = `${templateName}.docx`;
      a.click();
      URL.revokeObjectURL(url2);
    } catch {
      toast({ title: 'Ошибка скачивания', variant: 'destructive' });
    }
  };

  /** Получить HTML предпросмотра шаблона */
  const getPreviewHtml = async (templateId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/templates/${templateId}/preview`);
      const json = await res.json();
      if (!json.success) return null;
      return json.data.html as string;
    } catch {
      return null;
    }
  };

  return { templates, isLoading, downloadTemplate, getPreviewHtml };
}
