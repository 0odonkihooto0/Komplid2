'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

/** Строка предпросмотра из API */
export interface PreviewRow {
  rowIndex: number;
  date: string;
  description: string;
  location: string | null;
  normativeRef: string | null;
  weather: string | null;
  temperature: number | null;
  data: Record<string, unknown> | null;
}

/** Результат импорта */
export interface ImportStats {
  imported: number;
  skipped: number;
}

export function useExcelImport(objectId: string, journalId: string) {
  const { toast } = useToast();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [previewSkipped, setPreviewSkipped] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);

  const baseUrl = `/api/projects/${objectId}/journals/${journalId}`;

  /** Скачать пустой xlsx-шаблон */
  const downloadTemplate = useCallback(async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`${baseUrl}/excel-template`);
      if (!res.ok) throw new Error('Ошибка загрузки шаблона');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Извлекаем имя файла из заголовка, иначе дефолт
      const disposition = res.headers.get('content-disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] ? decodeURIComponent(match[1]) : 'template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Не удалось скачать шаблон', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  }, [baseUrl, toast]);

  /** Загрузить файл и получить предпросмотр строк */
  const previewFile = useCallback(
    async (file: File) => {
      setIsPreviewLoading(true);
      setPendingFile(file);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${baseUrl}/import-excel?preview=true`, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? 'Ошибка предпросмотра');
        }
        const json = (await res.json()) as {
          data: { rows: PreviewRow[]; total: number; skipped: number };
        };
        setPreviewRows(json.data.rows);
        setPreviewSkipped(json.data.skipped);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка предпросмотра';
        toast({ title: message, variant: 'destructive' });
        setPendingFile(null);
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [baseUrl, toast]
  );

  /** Подтвердить импорт (создать записи в БД) */
  const confirmImport = useCallback(async () => {
    if (!pendingFile) return;
    setIsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      const res = await fetch(`${baseUrl}/import-excel`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Ошибка импорта');
      }
      const json = (await res.json()) as {
        data: ImportStats;
      };
      setStats(json.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка импорта';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  }, [baseUrl, pendingFile, toast]);

  /** Сбросить состояние диалога */
  const reset = useCallback(() => {
    setPreviewRows(null);
    setPreviewSkipped(0);
    setPendingFile(null);
    setStats(null);
  }, []);

  return {
    downloadTemplate,
    previewFile,
    confirmImport,
    reset,
    isDownloading,
    isPreviewLoading,
    isImporting,
    previewRows,
    previewSkipped,
    stats,
  };
}
