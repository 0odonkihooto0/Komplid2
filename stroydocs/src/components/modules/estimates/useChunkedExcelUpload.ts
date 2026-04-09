'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ParsedEstimateItem } from '@/lib/estimates/types';
import { apiUrl } from './useEstimateImports';

/** Размер одного чанка (строк данных) при чанковании Excel */
const CHUNK_SIZE = 20;

/** Прогресс чанкового парсинга Excel */
export interface ChunkProgress {
  /** Всего чанков */
  totalChunks: number;
  /** Обработано чанков */
  processedChunks: number;
  /** Номера пропущенных чанков (0-based) */
  skippedChunks: number[];
  /** Предупреждения (fallback, пропуски) */
  warnings: string[];
  /** Использовался ли Gemini fallback хотя бы для одного чанка */
  usedFallback: boolean;
}

/** Шаг нового конвейера Excel-импорта */
export type UploadStep = 'idle' | 'uploading' | 'processing' | 'enriching';

/**
 * Хук для нового конвейера парсинга Excel-смет с чанкованием.
 *
 * Архитектура (без шага выбора строк):
 * 1. uploadAndProcess: загрузка в S3 + prepare-chunks + автоматическая обработка всех строк
 * 2. process-chunk×N (стриминг в streamedItems) + /start + enrich-normatives
 */
export function useChunkedExcelUpload(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [importRecordId, setImportRecordId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ChunkProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamedItems, setStreamedItems] = useState<ParsedEstimateItem[]>([]);

  const resetAll = useCallback(() => {
    setUploadStep('idle');
    setImportRecordId(null);
    setProgress(null);
    setIsProcessing(false);
    setStreamedItems([]);
  }, []);

  /**
   * Обрабатывает чанки строк и возвращает { importId, status }.
   * Вызывается сразу после prepare-chunks — все строки идут в AI без паузы.
   */
  const processChunks = useCallback(
    async (
      headers: string[],
      rows: string[][],
      currentImportRecordId: string
    ): Promise<{ importId: string; status: string } | null> => {
      setIsProcessing(true);
      setUploadStep('processing');
      setProgress(null);
      setStreamedItems([]);

      try {
        // Чанкование — все строки обрабатываются автоматически
        const chunks: string[][][] = [];
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          chunks.push(rows.slice(i, i + CHUNK_SIZE));
        }

        const currentProgress: ChunkProgress = {
          totalChunks: chunks.length,
          processedChunks: 0,
          skippedChunks: [],
          warnings: [],
          usedFallback: false,
        };
        setProgress({ ...currentProgress });

        // Накапливаем распознанные позиции из всех чанков
        const allItems: ParsedEstimateItem[] = [];

        // Последовательная отправка чанков
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          try {
            const chunkRes = await fetch(
              apiUrl(projectId, contractId, `/${currentImportRecordId}/process-chunk`),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chunkIndex,
                  headers,
                  rows: chunks[chunkIndex],
                }),
              }
            );

            if (!chunkRes.ok) {
              // "Skip & Mark": сервер вернул ошибку для этого чанка
              const errJson = await chunkRes.json().catch(() => ({}));
              const skippedMsg =
                (errJson as { error?: string }).error ||
                `Ошибка обработки блока ${chunkIndex + 1}. Заполните вручную.`;
              currentProgress.skippedChunks.push(chunkIndex);
              currentProgress.warnings.push(skippedMsg);
            } else {
              const chunkJson = await chunkRes.json();
              if (chunkJson.data?.warnings?.length > 0) {
                currentProgress.warnings.push(...(chunkJson.data.warnings as string[]));
              }
              if (chunkJson.data?.usedFallback) {
                currentProgress.usedFallback = true;
              }
              // Накапливаем позиции, корректируя sortOrder и parentIndex
              if (Array.isArray(chunkJson.data?.items)) {
                const offset = allItems.length;
                const newItems: ParsedEstimateItem[] = [];
                for (const item of chunkJson.data.items as ParsedEstimateItem[]) {
                  newItems.push({
                    ...item,
                    sortOrder: offset + (item.sortOrder ?? allItems.length + 1),
                    parentIndex:
                      typeof item.parentIndex === 'number'
                        ? offset + item.parentIndex
                        : undefined,
                  });
                }
                allItems.push(...newItems);
                // Стриминг — сразу показываем в UI
                setStreamedItems((prev) => [...prev, ...newItems]);
              }
            }
          } catch {
            // Сетевая ошибка при отправке чанка — пропускаем
            currentProgress.skippedChunks.push(chunkIndex);
            currentProgress.warnings.push(
              `Блок ${chunkIndex + 1}: сетевая ошибка, заполните вручную`
            );
          }

          currentProgress.processedChunks = chunkIndex + 1;
          setProgress({ ...currentProgress });
        }

        // Финализация — передаём накопленные позиции на бэкенд
        const startRes = await fetch(
          apiUrl(projectId, contractId, `/${currentImportRecordId}/start`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preProcessed: true, items: allItems }),
          }
        );
        const startJson = await startRes.json();

        if (!startJson.success) {
          if (startJson.data?.duplicateOf) {
            queryClient.invalidateQueries({ queryKey: ['estimates', contractId] });
            return { importId: startJson.data.duplicateOf, status: 'PREVIEW' };
          }
          throw new Error(startJson.error || 'Ошибка финализации импорта');
        }

        const finalImportId = startJson.data?.id || currentImportRecordId;

        // Обогащение нормативами (лучшее усилие, не блокирует)
        setUploadStep('enriching');
        try {
          await fetch(
            apiUrl(projectId, contractId, `/${finalImportId}/enrich-normatives`),
            { method: 'POST' }
          );
        } catch {
          // Обогащение не критично — игнорируем ошибку
        }

        queryClient.invalidateQueries({ queryKey: ['estimates', contractId] });

        if (currentProgress.warnings.length > 0) {
          toast({
            title: 'Смета обработана с предупреждениями',
            description: `${currentProgress.warnings.length} блок(а) требует ручного заполнения`,
            variant: 'default',
          });
        } else {
          toast({ title: 'Смета успешно обработана' });
        }

        return {
          importId: finalImportId,
          status: startJson.data?.status || 'PREVIEW',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        toast({ title: 'Ошибка импорта Excel', description: message, variant: 'destructive' });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [projectId, contractId, queryClient, toast]
  );

  /**
   * Полный конвейер: загрузка файла в S3 + prepare-chunks + автообработка всех строк.
   * Возвращает { importId, status } при успехе или null при ошибке.
   */
  const uploadAndProcess = useCallback(
    async (file: File): Promise<{ importId: string; status: string } | null> => {
      setUploadStep('uploading');
      setImportRecordId(null);
      setStreamedItems([]);

      try {
        // Шаг 1: инициализация — получаем pre-signed URL
        const initRes = await fetch(apiUrl(projectId, contractId, '/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.error);

        const { import: importRecord, uploadUrl } = initJson.data;
        setImportRecordId(importRecord.id);

        // Шаг 2: загрузка файла в S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (!uploadRes.ok) throw new Error('Ошибка загрузки файла в хранилище');

        // Шаг 3: prepare-chunks — получаем отфильтрованный 2D-массив
        const prepareRes = await fetch(
          apiUrl(projectId, contractId, `/${importRecord.id}/prepare-chunks`),
          { method: 'POST' }
        );
        const prepareJson = await prepareRes.json();
        if (!prepareJson.success) throw new Error(prepareJson.error);

        const { headers, rows } = prepareJson.data as {
          headers: string[];
          rows: string[][];
          totalRows: number;
        };

        if (rows.length === 0) {
          throw new Error('Excel-файл не содержит данных после фильтрации');
        }

        // Шаг 4: автоматически обрабатываем все строки (без ожидания выбора пользователем)
        return processChunks(headers, rows, importRecord.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        toast({ title: 'Ошибка загрузки Excel', description: message, variant: 'destructive' });
        setUploadStep('idle');
        return null;
      }
    },
    [projectId, contractId, toast, processChunks]
  );

  return {
    uploadAndProcess,
    uploadStep,
    importRecordId,
    streamedItems,
    progress,
    isProcessing,
    resetAll,
  };
}
