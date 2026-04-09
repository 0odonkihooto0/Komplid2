'use client';

import { useState, useMemo } from 'react';
import { useAvailableDocs, useCreatePackage } from './useIdClosure';

export type WizardStep = 1 | 2 | 3;

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  1: 'Шаг 1 из 3 — Выбор документов',
  2: 'Шаг 2 из 3 — Предпросмотр состава',
  3: 'Шаг 3 из 3 — Создание пакета',
};

// Унифицированная строка документа для таблицы выбора
export interface DocRow {
  id: string;
  kind: 'exec' | 'registry' | 'archive';
  type: string;
  number: string;
  title: string;
  contractId: string;
}

export function useClosureWizard(objectId: string, onClose: () => void) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [packageName, setPackageName] = useState('');
  const [packageNumber, setPackageNumber] = useState('');

  const { executionDocs, registries, archiveDocs, isLoading } = useAvailableDocs(objectId, true);
  const createPackage = useCreatePackage(objectId);

  // Собираем все документы в единый список
  const allDocs = useMemo<DocRow[]>(() => {
    const docs: DocRow[] = [];
    for (const d of executionDocs) {
      docs.push({
        id: d.id,
        kind: 'exec',
        type: d.type ?? 'ИД',
        number: d.number ?? '—',
        title: d.title ?? d.number ?? '—',
        contractId: d.contractId,
      });
    }
    for (const r of registries) {
      docs.push({
        id: r.id,
        kind: 'registry',
        type: 'Реестр',
        number: r.name ?? '—',
        title: r.name ?? '—',
        contractId: r.contractId,
      });
    }
    for (const a of archiveDocs) {
      docs.push({
        id: a.id,
        kind: 'archive',
        type: a.category ?? 'Архив',
        number: a.cipher ?? '—',
        title: a.fileName ?? '—',
        contractId: a.contractId,
      });
    }
    return docs;
  }, [executionDocs, registries, archiveDocs]);

  // Фильтрация по типу
  const filteredDocs = useMemo(() => {
    if (typeFilter === 'all') return allDocs;
    if (typeFilter === 'exec') return allDocs.filter((d) => d.kind === 'exec');
    if (typeFilter === 'registry') return allDocs.filter((d) => d.kind === 'registry');
    if (typeFilter === 'archive') return allDocs.filter((d) => d.kind === 'archive');
    // Фильтр по конкретному типу ИД (AOSR, OZR и т.д.)
    return allDocs.filter((d) => d.type === typeFilter);
  }, [allDocs, typeFilter]);

  const selectedRows = useMemo(
    () => allDocs.filter((d) => selectedIds.has(`${d.kind}:${d.id}`)),
    [allDocs, selectedIds]
  );

  // Процент полноты
  const completenessPercent = allDocs.length > 0
    ? Math.round((selectedRows.length / allDocs.length) * 100)
    : 0;

  function toggleDoc(kind: string, id: string) {
    const key = `${kind}:${id}`;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    const keys = allDocs.map((d) => `${d.kind}:${d.id}`);
    setSelectedIds(new Set(keys));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function handleCreate() {
    if (!packageName.trim()) return;

    // Разделяем выбранные ID по типам
    const executionDocIds: string[] = [];
    const registryIds: string[] = [];
    const archiveDocIds: string[] = [];

    Array.from(selectedIds).forEach((key) => {
      const [kind, id] = key.split(':');
      if (kind === 'exec') executionDocIds.push(id);
      else if (kind === 'registry') registryIds.push(id);
      else if (kind === 'archive') archiveDocIds.push(id);
    });

    createPackage.mutate(
      {
        name: packageName.trim(),
        number: packageNumber.trim() || undefined,
        executionDocIds,
        registryIds,
        archiveDocIds,
      },
      { onSuccess: onClose }
    );
  }

  return {
    step,
    setStep,
    selectedIds,
    typeFilter,
    setTypeFilter,
    packageName,
    setPackageName,
    packageNumber,
    setPackageNumber,
    allDocs,
    filteredDocs,
    selectedRows,
    completenessPercent,
    isLoading,
    toggleDoc,
    selectAll,
    deselectAll,
    handleCreate,
    createPending: createPackage.isPending,
  };
}
