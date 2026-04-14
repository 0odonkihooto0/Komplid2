import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface SigningStep {
  id: string;
  stepIndex: number;
  status: 'WAITING' | 'SIGNED' | 'REJECTED';
  signedAt: string | null;
  certificateInfo: string | null;
  user: { id: string; firstName: string; lastName: string; position: string | null };
}

export interface SigningRoute {
  id: string;
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  steps: SigningStep[];
}

export interface SigningTemplate {
  id: string;
  name: string;
  description: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  position: string | null;
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export function useSigningTab(projectId: string, contractId: string, docId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}/signing`;

  const [mode, setMode] = useState<'template' | 'manual'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('contract-participants');
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>([]);

  const { data: route, isLoading: isRouteLoading } = useQuery<SigningRoute | null>({
    queryKey: ['signing-route', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки маршрута подписания');
      const json: ApiResponse<SigningRoute | null> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      return json.data;
    },
  });

  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery<SigningTemplate[]>({
    queryKey: ['signing-templates'],
    queryFn: async () => {
      const res = await fetch('/api/signing-templates');
      if (!res.ok) throw new Error('Ошибка загрузки шаблонов');
      const json: ApiResponse<SigningTemplate[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      return json.data;
    },
  });

  const { data: employees = [], isLoading: isEmployeesLoading } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      if (!res.ok) throw new Error('Ошибка загрузки сотрудников');
      const json: ApiResponse<Employee[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      return json.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['signing-route', docId] });
    queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      const body =
        mode === 'template'
          ? { templateId: selectedTemplateId }
          : { signerIds: selectedSignerIds };

      const res = await fetch(`${baseUrl}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: ApiResponse<SigningRoute> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка запуска маршрута');
    },
    onSuccess: () => {
      toast({ title: 'Маршрут подписания запущен' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/sign`, { method: 'POST' });
      const json: ApiResponse<never> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка подписания');
    },
    onError: (err: Error) =>
      toast({
        title: 'Подписание недоступно',
        description: err.message,
        variant: 'destructive',
      }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, { method: 'DELETE' });
      const json: ApiResponse<unknown> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сброса маршрута');
    },
    onSuccess: () => {
      toast({ title: 'Маршрут подписания сброшен' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    route,
    isRouteLoading,
    templates,
    isTemplatesLoading,
    employees: employees.filter((e) => e.isActive),
    isEmployeesLoading,
    mode,
    setMode,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedSignerIds,
    setSelectedSignerIds,
    startMutation,
    signMutation,
    resetMutation,
  };
}
