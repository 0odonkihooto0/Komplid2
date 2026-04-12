'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

/**
 * Хук UI-логики для EstimateContractView:
 * - Состояние диалогов (создание, выбор расчёта)
 * - Развёрнутые разделы
 * - Обработчики тулбара (заглушки для незавершённых функций)
 */
export function useEstimateContractView() {
  const { toast } = useToast();

  // Диалог создания сметы контракта
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Диалог "Выбрать расчет"
  const [selectEstimateOpen, setSelectEstimateOpen] = useState(false);
  // ID позиции, для которой открыт "Выбрать расчет"
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Развёрнутые разделы
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  // Открыть диалог "Выбрать расчет" для конкретной позиции
  const openSelectEstimate = useCallback((rowId: string) => {
    setActiveRowId(rowId);
    setSelectEstimateOpen(true);
  }, []);

  const closeSelectEstimate = useCallback(() => {
    setActiveRowId(null);
    setSelectEstimateOpen(false);
  }, []);

  const handlePrint = useCallback(() => window.print(), []);

  // Обработчики тулбара (заглушки)
  const handleCreateSection = useCallback(() => {
    toast({ title: 'Создание раздела', description: 'Функция в разработке' });
  }, [toast]);

  const handleCreateSectionFromRef = useCallback(() => {
    toast({ title: 'Создание раздела из справочника', description: 'Функция в разработке' });
  }, [toast]);

  const handleRecalculate = useCallback(() => {
    toast({ title: 'Пересчёт', description: 'Функция в разработке' });
  }, [toast]);

  const handleExportTemplate = useCallback(() => {
    toast({ title: 'Экспорт в шаблон', description: 'Функция в разработке' });
  }, [toast]);

  const handleParams = useCallback(() => {
    toast({ title: 'Параметры', description: 'Функция в разработке' });
  }, [toast]);

  return {
    createDialogOpen, setCreateDialogOpen,
    selectEstimateOpen, activeRowId,
    openSelectEstimate, closeSelectEstimate,
    expandedSections, toggleSection,
    handlePrint,
    handleCreateSection,
    handleCreateSectionFromRef,
    handleRecalculate,
    handleExportTemplate,
    handleParams,
  };
}
