'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type MovementStatus = 'DRAFT' | 'CONDUCTED' | 'CANCELLED';
export type WarehouseMovementType =
  'RECEIPT' | 'SHIPMENT' | 'TRANSFER' | 'WRITEOFF' | 'RETURN'
  | 'RECEIPT_ORDER' | 'EXPENSE_ORDER';

export interface MovementLine {
  id: string;
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  nomenclature: { id: string; name: string; unit: string | null } | null;
  vatAmount: number | null;
  totalWithVat: number | null;
  basis: string | null;
  gtd: string | null;
  country: string | null;
  comment: string | null;
  discount: number | null;
  lineVatRate: number | null;
  recipientAddress: string | null;
}

export interface MovementDetail {
  id: string;
  number: string;
  movementType: WarehouseMovementType;
  status: MovementStatus;
  movementDate: string;
  notes: string | null;
  fromWarehouse: { id: string; name: string; location: string | null } | null;
  toWarehouse: { id: string; name: string; location: string | null } | null;
  lines: MovementLine[];
  attachmentS3Keys: string[];
  createdBy: { id: string; firstName: string; lastName: string } | null;
  consignor: string | null;
  consignee: string | null;
  arrivalDate: string | null;
  vatType: string | null;
  vatRate: number | null;
  currency: string;
  currencyId: string | null;
  currencyRef: { id: string; name: string; shortName: string; shortSymbol: string; code: string } | null;
  project: { name: string } | null;
}

export interface NomenclatureOption {
  id: string;
  name: string;
  unit: string | null;
}

// ─── Метки типов движений ─────────────────────────────────────────────────────

export const MOV_TYPE_LABELS: Record<WarehouseMovementType, string> = {
  RECEIPT: 'Поступление',
  SHIPMENT: 'Отгрузка',
  TRANSFER: 'Перемещение',
  WRITEOFF: 'Списание',
  RETURN: 'Возврат поставщику',
  RECEIPT_ORDER: 'Приходный ордер',
  EXPENSE_ORDER: 'Расходный ордер',
};

// ─── Хук загрузки деталей движения ───────────────────────────────────────────

export function useMovementDetail(objectId: string, movementId: string) {
  const { data, isLoading, error } = useQuery<MovementDetail>({
    queryKey: ['warehouse-movement', objectId, movementId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки движения');
      return json.data as MovementDetail;
    },
    enabled: !!objectId && !!movementId,
  });
  return { movement: data ?? null, isLoading, error };
}

// ─── Хук «Провести» движение (DRAFT → CONDUCTED) ──────────────────────────────

export function useConductMovement(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (movementId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}/conduct`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка проведения движения');
      return json.data as MovementDetail;
    },
    onSuccess: (_data, movementId) => {
      // Инвалидируем текущее движение и список движений объекта
      qc.invalidateQueries({ queryKey: ['warehouse-movement', objectId, movementId] });
      qc.invalidateQueries({ queryKey: ['warehouse-movements', objectId] });
      toast({ title: 'Движение проведено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук добавления строки движения ──────────────────────────────────────────

export function useAddLine(objectId: string, movementId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { nomenclatureId: string; quantity: number }) => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}/lines`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка добавления строки');
      return json.data as MovementLine;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-movement', objectId, movementId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук удаления строки движения ────────────────────────────────────────────

export function useDeleteLine(objectId: string, movementId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lineId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}/lines/${lineId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления строки');
      return lineId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-movement', objectId, movementId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук поиска номенклатуры ──────────────────────────────────────────────────

export function useNomenclature(objectId: string, search: string) {
  const { data, isLoading } = useQuery<NomenclatureOption[]>({
    queryKey: ['nomenclature', objectId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ search, limit: '50' });
      const res = await fetch(`/api/projects/${objectId}/nomenclature?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка поиска номенклатуры');
      return (json.data ?? json) as NomenclatureOption[];
    },
    // Поиск запускается только при 2+ символах
    enabled: !!objectId && search.length > 1,
  });
  return { options: data ?? [], isLoading };
}

// ─── Хук «Создать на основании» ──────────────────────────────────────────────

export function useCreateBasedOn(objectId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ movementId, targetType }: { movementId: string; targetType: WarehouseMovementType }) => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}/create-based-on`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetType }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания документа');
      return json.data as { id: string; number: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['warehouse-movements', objectId] });
      toast({ title: `Создан документ ${data.number}`, description: 'Переходим на вкладку склада' });
      // Редирект к складскому разделу для просмотра нового документа
      router.push(`/objects/${objectId}/resources/warehouse`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук удаления движения ────────────────────────────────────────────────────

export function useDeleteMovement(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (movementId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления движения');
      return movementId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-movements', objectId] });
      toast({ title: 'Движение удалено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Хук копирования движения ─────────────────────────────────────────────────

export function useCopyMovement(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ movementId, targetType }: { movementId: string; targetType: WarehouseMovementType }) => {
      const res = await fetch(
        `/api/projects/${objectId}/warehouse-movements/${movementId}/create-based-on`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetType }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка копирования движения');
      return json.data as { id: string; number: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['warehouse-movements', objectId] });
      toast({ title: `Копия создана: ${data.number}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
