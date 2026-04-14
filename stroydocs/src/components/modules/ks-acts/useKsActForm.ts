'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface KsActParticipant {
  role: string;
  orgName: string;
  inn?: string;
  representative?: string;
  position?: string;
  order?: string;
}

export interface KsActIndicator {
  name: string;
  unit?: string;
  designValue?: string;
  actualValue?: string;
}

export interface KsActWorkItem {
  name: string;
  unit?: string;
  volume?: string;
  note?: string;
}

export interface KsActCommissionMember {
  name: string;
  position?: string;
  role?: string;
  orgName?: string;
}

export interface KsActFormFields {
  designOrg?: string | null;
  designOrgInn?: string | null;
  objectDesc?: string | null;
  totalArea?: number | null;
  buildingVolume?: number | null;
  floorCount?: number | null;
  constructionClass?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  deviations?: string | null;
  constructionCost?: number | null;
  actualCost?: number | null;
  documents?: string | null;
  conclusion?: string | null;
  participants?: KsActParticipant[];
  indicators?: KsActIndicator[];
  workList?: KsActWorkItem[];
  commissionMembers?: KsActCommissionMember[];
  title?: string;
  documentDate?: string | null;
  note?: string | null;
}

export function useKsActDetail(objectId: string, contractId: string, actId: string | null) {
  return useQuery({
    queryKey: ['ks-acts', contractId, actId],
    queryFn: async () => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/ks-acts/${actId}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      return json.data;
    },
    enabled: !!actId,
  });
}

export function useUpdateKsAct(objectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ actId, data }: { actId: string; data: KsActFormFields }) => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/ks-acts/${actId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка сохранения');
      return json.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ks-acts', contractId, variables.actId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'Данные формы сохранены' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAutofillParticipants(objectId: string, contractId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (actId: string) => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/ks-acts/${actId}/autofill`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка автозаполнения');
      return json.data.participants as KsActParticipant[];
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка автозаполнения', description: error.message, variant: 'destructive' });
    },
  });
}

export function usePrintKsAct(objectId: string, contractId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (actId: string) => {
      const res = await fetch(
        `/api/objects/${objectId}/contracts/${contractId}/ks-acts/${actId}/print`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка генерации PDF');
      return json.data as { s3Key: string; fileName: string; downloadUrl: string };
    },
    onSuccess: (data) => {
      toast({ title: 'PDF сформирован', description: data.fileName });
      window.open(data.downloadUrl, '_blank');
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка генерации PDF', description: error.message, variant: 'destructive' });
    },
  });
}
