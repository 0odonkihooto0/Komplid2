'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import type { SupplierOrderCardData, DeliveryCondition } from './useSupplierOrderCard';
import { useUpdateOrder } from './useSupplierOrderCard';

/** Хук управляет состоянием и сохранением формы вкладки «Документ» */
export function useSupplierOrderDocForm(objectId: string, order: SupplierOrderCardData) {
  const { toast } = useToast();
  const updateOrder = useUpdateOrder(objectId, order.id);

  // ── Стороны ──
  const [supplierOrgId, setSupplierOrgId] = useState(order.supplierOrgId ?? '');
  const [supplierOrgName, setSupplierOrgName] = useState(order.supplierOrg?.name ?? '');
  const [customerOrgId, setCustomerOrgId] = useState(order.customerOrgId ?? '');
  const [customerOrgName, setCustomerOrgName] = useState(order.customerOrg?.name ?? '');

  // ── Склад и поставка ──
  const [warehouseId, setWarehouseId] = useState(order.warehouseId ?? '');
  const [deliveryDate, setDeliveryDate] = useState(
    order.deliveryDate ? order.deliveryDate.slice(0, 10) : ''
  );
  const [externalNumber, setExternalNumber] = useState(order.externalNumber ?? '');
  const [deliveryConditions, setDeliveryConditions] = useState<string>(
    order.deliveryConditions ?? 'NONE'
  );
  const [contractType, setContractType] = useState(order.contractType ?? '');

  // ── Готовность ──
  const [underdeliveryDate, setUnderdeliveryDate] = useState(
    order.underdeliveryDate ? order.underdeliveryDate.slice(0, 10) : ''
  );
  const [readinessCorrectionDate, setReadinessCorrectionDate] = useState(
    order.readinessCorrectionDate ? order.readinessCorrectionDate.slice(0, 10) : ''
  );
  const [expectedReadyDate, setExpectedReadyDate] = useState(
    order.expectedReadyDate ? order.expectedReadyDate.slice(0, 10) : ''
  );
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(
    order.expectedArrivalDate ? order.expectedArrivalDate.slice(0, 10) : ''
  );
  const [readinessThrough, setReadinessThrough] = useState(order.readinessThrough ?? '');

  // ── Прочее ──
  const [constructionObject, setConstructionObject] = useState(order.constructionObject ?? '');
  const [notes, setNotes] = useState(order.notes ?? '');

  function toIso(dateStr: string): string | null {
    if (!dateStr) return null;
    return new Date(dateStr).toISOString();
  }

  function handleSave() {
    updateOrder.mutate(
      {
        supplierOrgId: supplierOrgId.trim() || null,
        customerOrgId: customerOrgId.trim() || null,
        warehouseId: warehouseId.trim() || null,
        deliveryDate: toIso(deliveryDate),
        externalNumber: externalNumber.trim() || null,
        deliveryConditions: (deliveryConditions as DeliveryCondition) || null,
        contractType: contractType.trim() || null,
        underdeliveryDate: toIso(underdeliveryDate),
        readinessCorrectionDate: toIso(readinessCorrectionDate),
        expectedReadyDate: toIso(expectedReadyDate),
        expectedArrivalDate: toIso(expectedArrivalDate),
        readinessThrough: readinessThrough.trim() || null,
        constructionObject: constructionObject.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => toast({ title: 'Изменения сохранены' }),
      }
    );
  }

  return {
    // Стороны
    supplierOrgId, setSupplierOrgId, supplierOrgName, setSupplierOrgName,
    customerOrgId, setCustomerOrgId, customerOrgName, setCustomerOrgName,
    // Склад и поставка
    warehouseId, setWarehouseId,
    deliveryDate, setDeliveryDate,
    externalNumber, setExternalNumber,
    deliveryConditions, setDeliveryConditions,
    contractType, setContractType,
    // Готовность
    underdeliveryDate, setUnderdeliveryDate,
    readinessCorrectionDate, setReadinessCorrectionDate,
    expectedReadyDate, setExpectedReadyDate,
    expectedArrivalDate, setExpectedArrivalDate,
    readinessThrough, setReadinessThrough,
    // Прочее
    constructionObject, setConstructionObject,
    notes, setNotes,
    // Действие
    handleSave,
    isSaving: updateOrder.isPending,
  };
}
