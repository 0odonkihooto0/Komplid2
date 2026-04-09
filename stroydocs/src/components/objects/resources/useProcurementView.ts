'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useOrders,
  useCreateOrder,
  useCreateOrderFromRequest,
  useRequestOptions,
  type SupplierOrderListItem,
  type SupplierOrderStatus,
} from './useProcurement';

// ─── Разделы левой панели ─────────────────────────────────────────────────────

export type SectionId = 'orders' | 'warehouse-request' | 'supplier-request';

export const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'orders', label: 'Заказ поставщику' },
  { id: 'warehouse-request', label: 'Заявка на склад' },
  { id: 'supplier-request', label: 'Запрос поставщику' },
];

// ─── Хук состояния вкладки «Закупки» ────────────────────────────────────────

export function useProcurementView(objectId: string) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>('orders');

  // Фильтр по статусу
  const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | ''>('');

  // Диалог создания нового заказа
  const [createOpen, setCreateOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Диалог «Из заявки»
  const [fromRequestOpen, setFromRequestOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const { orders, isLoading } = useOrders(objectId, statusFilter);
  const createOrder = useCreateOrder(objectId);
  const createFromRequest = useCreateOrderFromRequest(objectId);
  const { requests: requestOptions } = useRequestOptions(objectId);

  function handleRowClick(row: SupplierOrderListItem) {
    router.push(`/objects/${objectId}/resources/procurement/${row.id}`);
  }

  function handleCreate() {
    createOrder.mutate(
      { number: newNumber.trim() || undefined, notes: newNotes.trim() || undefined },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewNumber('');
          setNewNotes('');
        },
      }
    );
  }

  function handleCreateFromRequest() {
    if (!selectedRequestId) return;
    createFromRequest.mutate(
      { requestId: selectedRequestId },
      {
        onSuccess: () => {
          setFromRequestOpen(false);
          setSelectedRequestId('');
        },
      }
    );
  }

  return {
    activeSection,
    setActiveSection,
    statusFilter,
    setStatusFilter,
    createOpen,
    setCreateOpen,
    newNumber,
    setNewNumber,
    newNotes,
    setNewNotes,
    fromRequestOpen,
    setFromRequestOpen,
    selectedRequestId,
    setSelectedRequestId,
    orders,
    isLoading,
    requestOptions,
    createOrderPending: createOrder.isPending,
    createFromRequestPending: createFromRequest.isPending,
    handleRowClick,
    handleCreate,
    handleCreateFromRequest,
  };
}
