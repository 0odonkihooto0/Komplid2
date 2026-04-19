'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { PIRClosureStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

export interface PIRClosureItemRow {
  id: string;
  workName: string;
  unit: string | null;
  volume: number | null;
  amount: number | null;
}

export interface PIRClosureApprovalStep {
  id: string;
  stepIndex: number;
  role: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string | null;
  userId: string | null;
  user: { id: string; firstName: string; lastName: string } | null;
}

export interface PIRClosureApprovalRoute {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
  currentStepIdx: number;
  steps: PIRClosureApprovalStep[];
}

export interface PIRClosureActDetail {
  id: string;
  number: string;
  status: PIRClosureStatus;
  periodStart: string;
  periodEnd: string;
  contractorOrgId: string | null;
  customerOrgId: string | null;
  totalAmount: number | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
  items: PIRClosureItemRow[];
  approvalRoute: PIRClosureApprovalRoute | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface FillItemsPayload {
  items: { workName: string; unit?: string; volume?: number; amount?: number }[];
}

// ─────────────────────────────────────────────
// Хук детали акта закрытия ПИР
// ─────────────────────────────────────────────

export function usePIRClosureDetail(projectId: string, actId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/pir-closure/${actId}`;

  const invalidateDetail = () =>
    queryClient.invalidateQueries({ queryKey: ['pir-closure-act', actId] });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ['pir-closure-acts', projectId] });

  const { data, isLoading } = useQuery<PIRClosureActDetail>({
    queryKey: ['pir-closure-act', actId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки акта закрытия');
      const json: ApiResponse<PIRClosureActDetail> = await res.json();
      return json.data;
    },
    enabled: !!actId && !!projectId,
  });

  const conductMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/conduct`, { method: 'POST' });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка проведения акта');
      }
    },
    onSuccess: () => {
      toast({ title: 'Акт проведён' });
      invalidateDetail();
      invalidateList();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  const fillItemsMutation = useMutation({
    mutationFn: async (payload: FillItemsPayload) => {
      const res = await fetch(`${baseUrl}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка сохранения позиций');
      }
    },
    onSuccess: () => {
      toast({ title: 'Позиции сохранены' });
      invalidateDetail();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  const startWorkflowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/workflow`, { method: 'POST' });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка запуска согласования');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования запущен' });
      invalidateDetail();
      invalidateList();
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  // Генерация PDF-печатной формы акта закрытия
  const printMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/print`, { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка генерации PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `closure-act-${actId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) =>
      toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    act: data ?? null,
    isLoading,
    conduct: conductMutation.mutate,
    isConducting: conductMutation.isPending,
    fillItems: fillItemsMutation.mutate,
    isFilling: fillItemsMutation.isPending,
    startWorkflow: startWorkflowMutation.mutate,
    isStartingWorkflow: startWorkflowMutation.isPending,
    printAct: printMutation.mutate,
    isPrinting: printMutation.isPending,
  };
}
