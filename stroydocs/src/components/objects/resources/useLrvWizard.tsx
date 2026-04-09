'use client';

import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { useGanttVersions, useGprMaterials, useCreateFromGpr, type GprMaterialItem } from './usePlanning';

// ─── Шаги визарда ────────────────────────────────────────────────────────────

export type Step = 1 | 2 | 3 | 4;

export const STEP_LABELS: Record<Step, string> = {
  1: 'Шаг 1 из 4 — Выбор версии ГПР',
  2: 'Шаг 2 из 4 — Выбор позиций',
  3: 'Шаг 3 из 4 — Предпросмотр',
  4: 'Шаг 4 из 4 — Номер ЛРВ',
};

// ─── Колонки для шага 2 ─────────────────────────────────────────────────────

function makeStep2Columns(
  selected: Set<string>,
  onToggle: (id: string) => void
): ColumnDef<GprMaterialItem>[] {
  return [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={selected.has(row.original.ganttTaskId + ':' + row.original.materialId)}
          onCheckedChange={() =>
            onToggle(row.original.ganttTaskId + ':' + row.original.materialId)
          }
        />
      ),
    },
    {
      accessorKey: 'materialName',
      header: 'Наименование',
      cell: ({ row }) => <span className="text-sm">{row.original.materialName}</span>,
    },
    {
      accessorKey: 'quantityRemaining',
      header: 'Кол-во',
      cell: ({ row }) => (
        <span className="text-sm text-right block">{row.original.quantityRemaining}</span>
      ),
    },
    {
      accessorKey: 'materialUnit',
      header: 'Ед.',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.materialUnit ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'ganttTaskName',
      header: 'Позиция ГПР',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.ganttTaskName}</span>
      ),
    },
  ];
}

// ─── Хук визарда ─────────────────────────────────────────────────────────────

export function useLrvWizard(objectId: string, onClose: () => void) {
  const [step, setStep] = useState<Step>(1);
  const [versionId, setVersionId] = useState<string>('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lrvNumber, setLrvNumber] = useState('');

  const { versions, isLoading: versionsLoading } = useGanttVersions(objectId);
  const { materials, isLoading: materialsLoading } = useGprMaterials(objectId, {
    ganttVersionId: versionId || null,
  });
  const createFromGpr = useCreateFromGpr(objectId);

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectedRows = useMemo(
    () => materials.filter((m) => selectedKeys.has(m.ganttTaskId + ':' + m.materialId)),
    [materials, selectedKeys]
  );

  const ganttTaskIds = useMemo(
    () => Array.from(new Set(selectedRows.map((r) => r.ganttTaskId))),
    [selectedRows]
  );

  const step2Cols = useMemo(
    () => makeStep2Columns(selectedKeys, toggleKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedKeys]
  );

  function handleCreate() {
    if (!lrvNumber.trim() || ganttTaskIds.length === 0) return;
    createFromGpr.mutate(
      { ganttVersionId: versionId, ganttTaskIds, number: lrvNumber.trim() },
      { onSuccess: onClose }
    );
  }

  return {
    step,
    setStep,
    versionId,
    setVersionId,
    selectedKeys,
    lrvNumber,
    setLrvNumber,
    versions,
    versionsLoading,
    materials,
    materialsLoading,
    selectedRows,
    step2Cols,
    createPending: createFromGpr.isPending,
    handleCreate,
  };
}
