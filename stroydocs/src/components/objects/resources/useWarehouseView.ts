'use client';

import { useState } from 'react';
import {
  useMovements,
  useWarehouses,
  useCreateMovement,
  type MovementListItem,
  type WarehouseMovementType,
} from './useWarehouse';

// ─── Разделы левой панели ─────────────────────────────────────────────────────

export type SectionId = WarehouseMovementType | 'balances';

export const MOVEMENT_SECTIONS: Array<{ id: WarehouseMovementType; label: string }> = [
  { id: 'RECEIPT',       label: 'Поступление' },
  { id: 'SHIPMENT',      label: 'Отгрузка' },
  { id: 'TRANSFER',      label: 'Перемещение' },
  { id: 'WRITEOFF',      label: 'Списание' },
  { id: 'RETURN',        label: 'Возврат поставщику' },
  { id: 'RECEIPT_ORDER', label: 'Приходный ордер' },
  { id: 'EXPENSE_ORDER', label: 'Расходный ордер' },
];

// ─── Хук состояния вкладки «Склад» ──────────────────────────────────────────

export function useWarehouseView(objectId: string) {
  const [activeSection, setActiveSection] = useState<SectionId>('RECEIPT');
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Поля формы создания движения
  const today = new Date().toISOString().split('T')[0];
  const [newDate, setNewDate] = useState(today);
  const [newNotes, setNewNotes] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');

  // Загружаем движения только когда activeSection — тип движения (не 'balances')
  const movementType = activeSection !== 'balances' ? activeSection : undefined;
  const { movements, isLoading } = useMovements(objectId, movementType);
  const { warehouses } = useWarehouses(objectId);
  const createMovement = useCreateMovement(objectId);

  function handleRowClick(row: MovementListItem) {
    setSelectedMovementId(row.id);
  }

  function handleCreate() {
    if (activeSection === 'balances') return;
    createMovement.mutate(
      {
        movementType: activeSection,
        movementDate: newDate,
        notes: newNotes.trim() || undefined,
        fromWarehouseId: fromWarehouseId || undefined,
        toWarehouseId: toWarehouseId || undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewDate(today);
          setNewNotes('');
          setFromWarehouseId('');
          setToWarehouseId('');
        },
      }
    );
  }

  // Определяем обязательность складов для каждого типа движения
  // EXPENSE_ORDER нужен склад-источник (аналог WRITEOFF)
  const needsFrom = activeSection === 'SHIPMENT' || activeSection === 'WRITEOFF' || activeSection === 'RETURN' || activeSection === 'TRANSFER' || activeSection === 'EXPENSE_ORDER';
  // RECEIPT_ORDER нужен склад-назначение (аналог RECEIPT)
  const needsTo   = activeSection === 'RECEIPT' || activeSection === 'TRANSFER' || activeSection === 'RECEIPT_ORDER';

  return {
    activeSection,
    setActiveSection,
    selectedMovementId,
    setSelectedMovementId,
    createOpen,
    setCreateOpen,
    newDate,
    setNewDate,
    newNotes,
    setNewNotes,
    fromWarehouseId,
    setFromWarehouseId,
    toWarehouseId,
    setToWarehouseId,
    movements,
    isLoading,
    warehouses,
    needsFrom,
    needsTo,
    createPending: createMovement.isPending,
    handleRowClick,
    handleCreate,
  };
}
