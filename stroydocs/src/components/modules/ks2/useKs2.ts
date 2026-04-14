import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ApiResponse } from '@/types/api';

export interface Ks2Act {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  totalAmount: number;
  laborCost: number;
  materialCost: number;
  s3Key: string | null;
  fileName: string | null;
  generatedAt: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  ks3Certificate: { id: string; status: string; s3Key: string | null } | null;
  _count?: { items: number };
  excludedAdditionalCostIds: string[];
  correctionToKs2Id: string | null;
  correctionToKs2: { id: string; number: string; totalAmount: number } | null;
}

export interface Ks2Item {
  id: string;
  sortOrder: number;
  name: string;
  unit: string;
  volume: number;
  unitPrice: number;
  totalPrice: number;
  laborCost: number;
  materialCost: number;
  workItemId: string | null;
  workItem?: { id: string; name: string; projectCipher: string } | null;
}

/** Допзатрата сметы, включённая или исключённая из акта КС-2 */
export interface Ks2AdditionalCost {
  id: string;
  name: string;
  costType: string;
  applicationMode: string;
  calculationMethod: string;
  value: string | null;
  constructionWorks: string | null;
  mountingWorks: string | null;
  equipment: string | null;
  other: string | null;
  isExcluded: boolean;
}

/** Список актов КС-2 по договору */
export function useKs2List(projectId: string, contractId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/ks2`;

  const { data: acts = [], isLoading } = useQuery<Ks2Act[]>({
    queryKey: ['ks2', contractId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки КС-2');
      const json: ApiResponse<Ks2Act[]> = await res.json();
      if (!json.success) throw new Error((json as { success: false; error: string }).error);
      return (json as { success: true; data: Ks2Act[] }).data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { periodStart: string; periodEnd: string }) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка создания акта');
      }
    },
    onSuccess: () => {
      toast({ title: 'Акт КС-2 создан' });
      queryClient.invalidateQueries({ queryKey: ['ks2', contractId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка удаления');
      }
    },
    onSuccess: () => {
      toast({ title: 'Акт удалён' });
      queryClient.invalidateQueries({ queryKey: ['ks2', contractId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return { acts, isLoading, createMutation, deleteMutation };
}

/** Детали акта КС-2 */
export function useKs2Detail(projectId: string, contractId: string, ks2Id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/ks2/${ks2Id}`;

  const { data: act, isLoading } = useQuery<Ks2Act & { items: Ks2Item[] }>({
    queryKey: ['ks2-detail', ks2Id],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки акта');
      const json: ApiResponse<Ks2Act & { items: Ks2Item[] }> = await res.json();
      if (!json.success) throw new Error((json as { success: false; error: string }).error);
      return (json as { success: true; data: Ks2Act & { items: Ks2Item[] } }).data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ks2-detail', ks2Id] });

  const autofillMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/autofill`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка автозаполнения');
      }
    },
    onSuccess: () => {
      toast({ title: 'Позиции заполнены из сметы' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/generate-pdf`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка генерации PDF');
      }
    },
    onSuccess: () => {
      toast({ title: 'PDF сгенерирован' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const generateKs3Mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/generate-ks3`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка создания КС-3');
      }
    },
    onSuccess: () => {
      toast({ title: 'КС-3 создан' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const generateKs3PdfMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/ks3/generate-pdf`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка генерации PDF КС-3');
      }
    },
    onSuccess: () => {
      toast({ title: 'PDF КС-3 сгенерирован' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  /** Обновление ссылки на исходный акт (если это корректировочный КС-2) */
  const updateCorrectionMutation = useMutation({
    mutationFn: async (correctionToKs2Id: string | null) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctionToKs2Id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка сохранения');
      }
    },
    onSuccess: () => {
      toast({ title: 'Сохранено' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    act,
    isLoading,
    autofillMutation,
    generatePdfMutation,
    generateKs3Mutation,
    generateKs3PdfMutation,
    updateCorrectionMutation,
  };
}

/** Допзатраты сметы для акта КС-2 */
export function useKs2AdditionalCosts(projectId: string, contractId: string, ks2Id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/ks2/${ks2Id}`;

  const { data, isLoading } = useQuery<{ costs: Ks2AdditionalCost[]; totalCount: number }>({
    queryKey: ['ks2-additional-costs', ks2Id],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/additional-costs`);
      if (!res.ok) throw new Error('Ошибка загрузки ДЗ сметы');
      const json: ApiResponse<{ costs: Ks2AdditionalCost[]; totalCount: number }> = await res.json();
      if (!json.success) throw new Error((json as { success: false; error: string }).error);
      return (json as { success: true; data: { costs: Ks2AdditionalCost[]; totalCount: number } }).data;
    },
  });

  /** Сохранение списка исключённых допзатрат */
  const updateExcludedMutation = useMutation({
    mutationFn: async (excludedIds: string[]) => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedAdditionalCostIds: excludedIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка сохранения');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ks2-additional-costs', ks2Id] });
      queryClient.invalidateQueries({ queryKey: ['ks2-detail', ks2Id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    costs: data?.costs ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    updateExcludedMutation,
  };
}
