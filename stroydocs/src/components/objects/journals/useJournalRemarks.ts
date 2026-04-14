'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface JournalRemark {
  id: string;
  title: string | null;
  text: string;
  status: string;
  remediationDeadline: string | null;
  issuedAt: string | null;
  objectDescription: string | null;
  attachmentS3Keys: string[];
  author: { id: string; firstName: string | null; lastName: string | null };
  issuedBy: { id: string; firstName: string | null; lastName: string | null } | null;
  resolvedBy: { id: string; firstName: string | null; lastName: string | null } | null;
  _count: { replies: number };
  createdAt: string;
}

export interface RemarkReply {
  id: string;
  title: string | null;
  text: string;
  author: { id: string; firstName: string | null; lastName: string | null };
  createdAt: string;
}

interface CreateRemarkInput {
  title?: string;
  text: string;
  issuedById?: string;
  issuedAt?: string;
  remediationDeadline?: string;
  objectDescription?: string;
  attachmentS3Keys?: string[];
}

const BASE = (objectId: string, journalId: string) =>
  `/api/projects/${objectId}/journals/${journalId}/remarks`;

export function useJournalRemarks(objectId: string, journalId: string) {
  const qc = useQueryClient();
  const [selectedRemark, setSelectedRemark] = useState<JournalRemark | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Список замечаний
  const { data, isLoading } = useQuery({
    queryKey: ['journal-remarks', journalId],
    queryFn: async () => {
      const res = await fetch(`${BASE(objectId, journalId)}?limit=200`);
      if (!res.ok) throw new Error('Ошибка загрузки замечаний');
      const json = await res.json();
      return json as { data: JournalRemark[]; meta: { total: number } };
    },
  });

  const remarks = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['journal-remarks', journalId] });

  // Создать замечание
  const createMutation = useMutation({
    mutationFn: async (input: CreateRemarkInput) => {
      const res = await fetch(BASE(objectId, journalId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Ошибка создания замечания');
      return res.json();
    },
    onSuccess: invalidate,
  });

  // Принять (RESOLVED)
  const acceptMutation = useMutation({
    mutationFn: async (remarkId: string) => {
      const res = await fetch(`${BASE(objectId, journalId)}/${remarkId}/accept`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Ошибка принятия замечания');
      return res.json();
    },
    onSuccess: (result) => {
      invalidate();
      if (selectedRemark?.id === result.data?.id) setSelectedRemark(result.data);
    },
  });

  // Вернуть на доработку (OPEN)
  const returnMutation = useMutation({
    mutationFn: async (remarkId: string) => {
      const res = await fetch(`${BASE(objectId, journalId)}/${remarkId}/return`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Ошибка возврата замечания');
      return res.json();
    },
    onSuccess: (result) => {
      invalidate();
      if (selectedRemark?.id === result.data?.id) setSelectedRemark(result.data);
    },
  });

  // Ответы на замечание
  const { data: repliesData, isLoading: isRepliesLoading } = useQuery({
    queryKey: ['remark-replies', selectedRemark?.id],
    queryFn: async () => {
      const res = await fetch(
        `${BASE(objectId, journalId)}/${selectedRemark!.id}/replies`,
      );
      if (!res.ok) throw new Error('Ошибка загрузки ответов');
      const json = await res.json();
      return json.data as RemarkReply[];
    },
    enabled: !!selectedRemark,
  });

  const replies = repliesData ?? [];

  // Добавить ответ
  const addReplyMutation = useMutation({
    mutationFn: async (input: { title?: string; text: string }) => {
      const res = await fetch(
        `${BASE(objectId, journalId)}/${selectedRemark!.id}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) throw new Error('Ошибка добавления ответа');
      return res.json();
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['remark-replies', selectedRemark?.id] }),
  });

  const openSheet = (remark: JournalRemark) => {
    setSelectedRemark(remark);
    setSheetOpen(true);
  };

  return {
    remarks,
    total,
    isLoading,
    createRemark: createMutation.mutate,
    isCreating: createMutation.isPending,
    acceptRemark: (id: string) => acceptMutation.mutate(id),
    isAccepting: acceptMutation.isPending,
    returnRemark: (id: string) => returnMutation.mutate(id),
    isReturning: returnMutation.isPending,
    selectedRemark,
    setSelectedRemark,
    sheetOpen,
    setSheetOpen,
    openSheet,
    replies,
    isRepliesLoading,
    addReply: addReplyMutation.mutate,
    isAddingReply: addReplyMutation.isPending,
  };
}
