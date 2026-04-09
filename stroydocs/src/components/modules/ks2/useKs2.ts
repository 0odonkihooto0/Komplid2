import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

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

interface ApiResponse<T> {
  success: boolean;
  data: T;
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
      return json.data;
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
      return json.data;
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

  return {
    act,
    isLoading,
    autofillMutation,
    generatePdfMutation,
    generateKs3Mutation,
    generateKs3PdfMutation,
  };
}
