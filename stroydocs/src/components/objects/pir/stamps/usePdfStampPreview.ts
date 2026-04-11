'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { PdfStamp } from './types';

interface UsePdfStampPreviewParams {
  objectId: string;
  currentPage: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

/**
 * Хук для управления штампами в режиме предпросмотра PDF.
 * Предоставляет мутации перемещения, ресайза, удаления и редактирования текста,
 * а также состояние диалога редактирования текста штампа.
 */
export function usePdfStampPreview({ objectId, currentPage }: UsePdfStampPreviewParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Состояние для редактирования текста штампа
  const [editingStamp, setEditingStamp] = useState<PdfStamp | null>(null);
  const [editText, setEditText] = useState('');

  // Мутация перемещения штампа
  const moveMutation = useMutation({
    mutationFn: async ({ sid, x, y }: { sid: string; x: number; y: number }) => {
      const res = await fetch(`/api/projects/${objectId}/stamps/${sid}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // page передаётся как 0-based (currentPage - 1)
        body: JSON.stringify({ positionX: x, positionY: y, page: currentPage - 1 }),
      });
      // Читаем тело ровно один раз
      const json: ApiResponse<PdfStamp> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка перемещения штампа');
      return json.data;
    },
    onSuccess: () => {
      // Инвалидируем по частичному ключу, чтобы обновить все связанные запросы
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка перемещения', description: err.message, variant: 'destructive' });
    },
  });

  // Мутация изменения размера штампа
  const resizeMutation = useMutation({
    mutationFn: async ({ sid, w, h }: { sid: string; w: number; h: number }) => {
      const res = await fetch(`/api/projects/${objectId}/stamps/${sid}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width: w, height: h }),
      });
      // Читаем тело ровно один раз
      const json: ApiResponse<PdfStamp> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка изменения размера штампа');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка изменения размера', description: err.message, variant: 'destructive' });
    },
  });

  // Мутация удаления штампа
  const deleteMutation = useMutation({
    mutationFn: async (sid: string) => {
      const res = await fetch(`/api/projects/${objectId}/stamps/${sid}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err: ApiResponse<null> = await res.json();
        throw new Error(err.error ?? 'Ошибка удаления штампа');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId] });
      toast({ title: 'Штамп удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка удаления', description: err.message, variant: 'destructive' });
    },
  });

  // Мутация редактирования текста штампа
  const editTextMutation = useMutation({
    mutationFn: async ({ sid, text }: { sid: string; text: string }) => {
      const res = await fetch(`/api/projects/${objectId}/stamps/${sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stampText: text }),
      });
      // Читаем тело ровно один раз
      const json: ApiResponse<PdfStamp> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка редактирования штампа');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId] });
      toast({ title: 'Текст штампа обновлён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка редактирования', description: err.message, variant: 'destructive' });
    },
  });

  // --- Обработчики для передачи в компоненты ---

  /** Вызывается после завершения перетаскивания штампа */
  function handleDragEnd(id: string, x: number, y: number): void {
    moveMutation.mutate({ sid: id, x, y });
  }

  /** Вызывается после завершения изменения размера штампа */
  function handleResizeEnd(id: string, w: number, h: number): void {
    resizeMutation.mutate({ sid: id, w, h });
  }

  /** Вызывается при нажатии «Удалить» в меню штампа */
  function handleDelete(id: string): void {
    deleteMutation.mutate(id);
  }

  /** Открывает диалог редактирования текста для указанного штампа */
  function handleEditStart(stamp: PdfStamp): void {
    setEditingStamp(stamp);
    setEditText(stamp.stampText);
  }

  /** Сохраняет отредактированный текст и закрывает диалог */
  function handleEditSave(): void {
    if (!editingStamp) return;
    editTextMutation.mutate(
      { sid: editingStamp.id, text: editText },
      {
        onSuccess: () => {
          setEditingStamp(null);
          setEditText('');
        },
      },
    );
  }

  return {
    moveMutation,
    resizeMutation,
    deleteMutation,
    editTextMutation,
    editingStamp,
    setEditingStamp,
    editText,
    setEditText,
    handleDragEnd,
    handleResizeEnd,
    handleDelete,
    handleEditStart,
    handleEditSave,
  };
}
