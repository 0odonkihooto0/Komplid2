'use client';

import { useState, useCallback } from 'react';
import type { EstimateItemDetail } from '@/hooks/useEstimateTree';
import { useEstimateTree } from '@/hooks/useEstimateTree';

type UseEstimateTreeReturn = ReturnType<typeof useEstimateTree>;

/**
 * Хук UI-логики для EstimateTreeView:
 * - Режим редактирования с переходами статуса (OK → EDITING → RECALCULATING → OK)
 * - Поиск по позициям
 * - Состояние диалогов (история, редактирование позиции)
 * - Добавление раздела
 */
export function useEstimateTreeView(tree: UseEstimateTreeReturn) {
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editDialogItem, setEditDialogItem] = useState<EstimateItemDetail | null>(null);
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [coefficientsOpen, setCoefficientsOpen] = useState(false);
  const [additionalCostsOpen, setAdditionalCostsOpen] = useState(false);

  // Вход в режим редактирования: статус → EDITING
  const enterEditMode = useCallback(async () => {
    await tree.updateStatus.mutateAsync('EDITING');
    setEditMode(true);
  }, [tree.updateStatus]);

  // Выход из режима редактирования: пересчёт итогов, статус → OK
  const exitEditMode = useCallback(async () => {
    setEditMode(false);
    await tree.updateStatus.mutateAsync('RECALCULATING');
    await tree.recalculate.mutateAsync();
    await tree.updateStatus.mutateAsync('OK');
  }, [tree.updateStatus, tree.recalculate]);

  // Toggle режима редактирования
  const toggleEditMode = useCallback(async () => {
    if (editMode) {
      await exitEditMode();
    } else {
      await enterEditMode();
    }
  }, [editMode, enterEditMode, exitEditMode]);

  // Обработчик добавления раздела
  const handleAddChapter = useCallback(async () => {
    const name = newChapterName.trim();
    if (!name) return;
    await tree.addChapter.mutateAsync(name);
    setNewChapterName('');
    setAddingChapter(false);
  }, [newChapterName, tree.addChapter]);

  // Открыть диалог редактирования позиции
  const openEditDialog = useCallback((item: EstimateItemDetail) => {
    setEditDialogItem(item);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditDialogItem(null);
  }, []);

  return {
    // Режим редактирования
    editMode,
    toggleEditMode,
    isToggling: tree.updateStatus.isPending || tree.recalculate.isPending,

    // Поиск
    search,
    setSearch,

    // Диалог истории
    historyOpen,
    setHistoryOpen,

    // Диалог редактирования позиции
    editDialogItem,
    openEditDialog,
    closeEditDialog,

    // Добавление раздела
    addingChapter,
    setAddingChapter,
    newChapterName,
    setNewChapterName,
    handleAddChapter,

    // Диалоги ДЗ и коэффициентов
    coefficientsOpen,
    setCoefficientsOpen,
    additionalCostsOpen,
    setAdditionalCostsOpen,
  };
}
