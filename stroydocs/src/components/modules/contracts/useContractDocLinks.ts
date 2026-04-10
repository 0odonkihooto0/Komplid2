'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export type DocLinkType = 'ZNP' | 'ZNII';

export interface ContractDocLinkItem {
  id: string;
  contractId: string;
  documentId: string;
  linkType: DocLinkType;
  createdAt: string;
  document: {
    id: string;
    name: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
    folder: { name: string };
  };
}

interface CreateDocLinkInput {
  documentId: string;
  linkType: DocLinkType;
}

const base = (p: string, c: string) =>
  `/api/projects/${p}/contracts/${c}/contract-doc-links`;

/** Хук для работы со связями договор-документ (ЗнП / ЗнИИ) */
export function useContractDocLinks(
  projectId: string,
  contractId: string,
  linkType: DocLinkType,
) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['contract-doc-links', contractId, linkType];

  const { data: links = [], isLoading } = useQuery<ContractDocLinkItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${base(projectId, contractId)}?linkType=${linkType}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  /** Привязать документ к договору */
  const createMutation = useMutation({
    mutationFn: async (data: CreateDocLinkInput) => {
      const res = await fetch(base(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ContractDocLinkItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Документ привязан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Удалить привязку документа */
  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch(`${base(projectId, contractId)}/${linkId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Привязка удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { links, isLoading, createMutation, deleteMutation };
}
