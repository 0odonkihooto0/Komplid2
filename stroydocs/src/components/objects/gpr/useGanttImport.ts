'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ── Типы ───────────────────────────────────────────────────────────

export type ImportFormat = 'EXCEL' | 'PRIMAVERA' | 'MS_PROJECT' | 'SPIDER';

export type ImportStep = 'idle' | 'validating' | 'ready' | 'importing' | 'success' | 'error';

export interface ImportResult {
  taskCount: number;
  depCount: number;
  warnings: string[];
}

/** Человекочитаемые метки форматов */
export const FORMAT_LABELS: Record<ImportFormat, string> = {
  EXCEL: 'MS Excel',
  PRIMAVERA: 'Primavera P6',
  MS_PROJECT: 'MS Project',
  SPIDER: 'Spider Project',
};

/** Допустимые расширения по формату */
const ACCEPT_MAP: Record<Exclude<ImportFormat, 'SPIDER'>, Record<string, string[]>> = {
  EXCEL: {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
  },
  PRIMAVERA: { 'application/octet-stream': ['.xer'] },
  MS_PROJECT: { 'text/xml': ['.xml'], 'application/octet-stream': ['.mpp'] },
};

export function getAcceptForFormat(format: ImportFormat): Record<string, string[]> | null {
  if (format === 'SPIDER') return null;
  return ACCEPT_MAP[format];
}

// ── Хук импорта ────────────────────────────────────────────────────

export function useGanttImport(
  objectId: string,
  versionId: string,
  format: ImportFormat,
  hasExistingTasks: boolean,
) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [file, setFileState] = useState<File | null>(null);
  const [step, setStep] = useState<ImportStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [withVat, setWithVat] = useState(true);

  const setFile = useCallback((f: File | null) => {
    setFileState(f);
    setError(null);
    setImportResult(null);
    if (f) {
      setStep('validating');
      // Клиентская валидация выполнена dropzone — сразу ready
      setTimeout(() => setStep('ready'), 300);
    } else {
      setStep('idle');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || format === 'SPIDER') return;
    setStep('importing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      formData.append('withVat', String(withVat));
      if (hasExistingTasks) {
        formData.append('replace', 'true');
      }

      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId}/import-file`,
        { method: 'POST', body: formData },
      );
      const json = await res.json();

      if (!json.success) {
        setStep('error');
        setError(json.error ?? 'Ошибка импорта');
        return;
      }

      const result = json.data as ImportResult;
      setImportResult(result);
      setStep('success');

      await qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      await qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });

      toast({
        title: 'Импорт завершён',
        description: `Импортировано ${result.taskCount} задач`,
      });
    } catch {
      setStep('error');
      setError('Произошла ошибка при импорте. Попробуйте ещё раз.');
    }
  }, [file, format, withVat, hasExistingTasks, objectId, versionId, qc, toast]);

  const reset = useCallback(() => {
    setFileState(null);
    setStep('idle');
    setError(null);
    setImportResult(null);
    setWithVat(true);
  }, []);

  return {
    file, setFile,
    step, withVat, setWithVat,
    error, importResult,
    handleImport, reset,
  };
}

// ── Хук экспорта ───────────────────────────────────────────────────

export function useGanttExport(objectId: string, versionId: string | null) {
  const downloadExport = useCallback(
    (format: 'excel' | 'excel_deps' | 'pdf') => {
      if (!versionId) return;
      window.open(
        `/api/projects/${objectId}/gantt-versions/${versionId}/export?format=${format}`,
        '_blank',
      );
    },
    [objectId, versionId],
  );

  return { downloadExport };
}
