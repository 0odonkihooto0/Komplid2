'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  position: string | null;
  email: string;
}

export interface ObjectParticipant {
  organization: { id: string; name: string };
  roles: string[];
}

export interface CreateSEDPayload {
  docType: string;
  title: string;
  body?: string;
  senderOrgId: string;
  receiverOrgIds: string[];
  senderUserId?: string;
  receiverUserId?: string;
  receiverOrgId?: string;
  date?: string;
  number?: string;
  tags?: string[];
}

interface UseCreateSEDDocumentOptions {
  objectId: string;
  open: boolean;
  onSuccess: () => void;
}

export function useCreateSEDDocument({ objectId, open, onSuccess }: UseCreateSEDDocumentOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<ObjectParticipant[]>({
    queryKey: ['object-participants', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/participants`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const { data: nextNumberData } = useQuery<{ number: string }>({
    queryKey: ['sed-next-number', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/sed/next-number`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
    staleTime: 0, // Каждый раз при открытии диалога — свежее значение
  });

  const addFile = (files: File[]) => {
    setStagedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async ({ payload, activate }: { payload: CreateSEDPayload; activate: boolean }) => {
      // Шаг 1: создание документа
      const res = await fetch(`/api/objects/${objectId}/sed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания документа');
      const created = json.data as { id: string };

      // Шаг 2: активация если нужно
      if (activate) {
        await fetch(`/api/objects/${objectId}/sed/${created.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
      }

      // Шаг 3: загрузка вложений через presigned URL
      for (const file of stagedFiles) {
        const attachRes = await fetch(`/api/objects/${objectId}/sed/${created.id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size }),
        });
        const attachJson = await attachRes.json();
        if (attachJson.success && attachJson.data?.uploadUrl) {
          await fetch(attachJson.data.uploadUrl, { method: 'PUT', body: file });
        }
      }

      return created;
    },
    onSuccess: (_data, { activate }) => {
      queryClient.invalidateQueries({ queryKey: ['sed', objectId] });
      toast({ title: activate ? 'Документ создан и активирован' : 'Черновик сохранён' });
      setStagedFiles([]);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return {
    employees,
    employeesLoading,
    participants,
    participantsLoading,
    nextNumber: nextNumberData?.number ?? '',
    stagedFiles,
    addFile,
    removeFile,
    createMutation,
  };
}
