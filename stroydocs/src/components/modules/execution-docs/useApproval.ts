import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

interface ApprovalStep {
  id: string;
  stepIndex: number;
  role: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string | null;
  user: { id: string; firstName: string; lastName: string; position: string | null } | null;
}

interface ApprovalRoute {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
  currentStepIdx: number;
  steps: ApprovalStep[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Хук управления маршрутом согласования ИД */
export function useApproval(projectId: string, contractId: string, docId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}/approval`;

  const { data: route, isLoading } = useQuery<ApprovalRoute | null>({
    queryKey: ['approval', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки маршрута');
      const json: ApiResponse<ApprovalRoute | null> = await res.json();
      return json.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['approval', docId] });
    // Также обновляем статус документа
    queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка запуска согласования');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования запущен' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const decideMutation = useMutation({
    mutationFn: async ({ decision, comment }: { decision: 'APPROVED' | 'REJECTED'; comment?: string }) => {
      const res = await fetch(`${baseUrl}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка принятия решения');
      }
    },
    onSuccess: () => {
      toast({ title: 'Решение сохранено' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка сброса маршрута');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования сброшен' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return { route, isLoading, startMutation, decideMutation, resetMutation };
}
