'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  useOrders,
  useOrderCounts,
  useCreateOrder,
  useCreateOrderFromRequest,
  useRequestOptions,
  type SupplierOrderListItem,
  type SupplierOrderStatus,
  type SupplierOrderType,
} from './useProcurement';

// ─── Разделы левой панели ─────────────────────────────────────────────────────

export type SectionId = 'orders' | 'warehouse-requests' | 'inquiries';

export const SECTIONS: Array<{ id: SectionId; label: string; type: SupplierOrderType }> = [
  { id: 'orders',             label: 'Заказ поставщику',  type: 'SUPPLIER_ORDER'    },
  { id: 'warehouse-requests', label: 'Заявка на склад',   type: 'WAREHOUSE_REQUEST' },
  { id: 'inquiries',          label: 'Запрос поставщику', type: 'SUPPLIER_INQUIRY'  },
];

// Метки кнопки «Добавить» в зависимости от раздела
const ADD_LABEL: Record<SectionId, string> = {
  'orders':             'Добавить заказ',
  'warehouse-requests': 'Добавить заявку',
  'inquiries':          'Добавить запрос',
};

// ─── Хук состояния вкладки «Закупки» ────────────────────────────────────────

export function useProcurementView(objectId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Активный раздел — синхронизируется с URL ?section=
  const activeSection = (searchParams.get('section') as SectionId | null) ?? 'orders';

  function setActiveSection(id: SectionId) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('section', id);
    router.push(`${pathname}?${sp.toString()}`);
  }

  // Тип документа для активного раздела
  const activeType = SECTIONS.find((s) => s.id === activeSection)?.type ?? 'SUPPLIER_ORDER';

  // Метка кнопки «Добавить»
  const addLabel = ADD_LABEL[activeSection];

  // Фильтр по статусу
  const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | ''>('');

  // Диалог создания нового документа
  const [createOpen, setCreateOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Диалог «Из заявки» (только для раздела orders)
  const [fromRequestOpen, setFromRequestOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const { orders, isLoading } = useOrders(objectId, statusFilter, activeType);
  const counts = useOrderCounts(objectId);
  const createOrder = useCreateOrder(objectId);
  const createFromRequest = useCreateOrderFromRequest(objectId);
  const { requests: requestOptions } = useRequestOptions(objectId);

  function handleRowClick(row: SupplierOrderListItem) {
    router.push(`/objects/${objectId}/resources/procurement/${row.id}`);
  }

  function handleCreate() {
    createOrder.mutate(
      {
        number: newNumber.trim() || undefined,
        notes: newNotes.trim() || undefined,
        type: activeType,
      },
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
    activeType,
    addLabel,
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
    counts,
    requestOptions,
    createOrderPending: createOrder.isPending,
    createFromRequestPending: createFromRequest.isPending,
    handleRowClick,
    handleCreate,
    handleCreateFromRequest,
  };
}
