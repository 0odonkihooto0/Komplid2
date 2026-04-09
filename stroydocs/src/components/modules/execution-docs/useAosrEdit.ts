'use client';

import { useEditDocFields } from './useEditDocFields';

/**
 * Хук для редактирования полей АОСР.
 * Обёртка над useEditDocFields — сохраняет overrideFields и перегенерирует PDF.
 */
export function useAosrEdit(projectId: string, contractId: string, docId: string) {
  const { saveAndRegenerate, isPending } = useEditDocFields(projectId, contractId, docId);
  return { saveAndRegenerate, isPending };
}
