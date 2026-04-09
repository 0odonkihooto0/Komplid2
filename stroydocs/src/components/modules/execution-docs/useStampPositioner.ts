'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// Тип определён локально, чтобы не импортировать server-only модуль stamp-overlay
export type StampType = 'work_permit' | 'certified_copy';

interface StampPosition {
  page: number;
  x: number; // нормализованная 0–1
  y: number; // нормализованная 0–1
}

interface UseStampPositionerParams {
  projectId: string;
  contractId: string;
  docId: string;
  docNumber?: string;
  onSuccess?: () => void;
}

export function useStampPositioner({
  projectId,
  contractId,
  docId,
  docNumber,
  onSuccess,
}: UseStampPositionerParams) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [stampType, setStampType] = useState<StampType>('work_permit');
  const [position, setPosition] = useState<StampPosition | null>(null);

  // Поля штампа
  const [responsibleName, setResponsibleName] = useState('');
  const [certifiedByName, setCertifiedByName] = useState('');
  const [certifiedByPos, setCertifiedByPos] = useState('');

  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}`;

  // Обработчик клика по PDF-странице (нормализованные координаты)
  const handlePageClick = useCallback((page: number, x: number, y: number) => {
    setPosition({ page, x, y });
  }, []);

  // Мутация наложения штампа
  const stampMutation = useMutation({
    mutationFn: async () => {
      if (!position) throw new Error('Выберите позицию штампа на PDF');

      const res = await fetch(`${baseUrl}/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stampType,
          page: position.page - 1, // PdfViewer отдаёт 1-based, API ждёт 0-based
          x: position.x,
          y: position.y,
          stampData: {
            docNumber,
            responsibleName: responsibleName || undefined,
            certifiedByName: certifiedByName || undefined,
            certifiedByPos: certifiedByPos || undefined,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { stampS3Key: string; downloadUrl: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Штамп наложен на PDF' });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка наложения штампа',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const canApply = !!position;

  const reset = useCallback(() => {
    setPosition(null);
    setResponsibleName('');
    setCertifiedByName('');
    setCertifiedByPos('');
    setStampType('work_permit');
  }, []);

  return {
    stampType,
    setStampType,
    position,
    handlePageClick,
    responsibleName,
    setResponsibleName,
    certifiedByName,
    setCertifiedByName,
    certifiedByPos,
    setCertifiedByPos,
    stampMutation,
    canApply,
    reset,
  };
}
