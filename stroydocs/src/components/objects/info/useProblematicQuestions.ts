'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { ProblemIssueType, ProblemIssueStatus } from '@prisma/client';

export interface ProblematicQuestion {
  id:             string;
  type:           ProblemIssueType;
  status:         ProblemIssueStatus;
  description:    string;
  causes:         string | null;
  measuresTaken:  string | null;
  resolutionDate: string | null;
  createdAt:      string;
  updatedAt:      string;
  projectId:      string;
  authorId:       string;
  author:         { id: string; firstName: string; lastName: string };
  assigneeOrg:    { id: string; name: string } | null;
  verifierOrg:    { id: string; name: string } | null;
  _count:         { attachments: number };
}

export interface ProblematicQuestionDetail extends ProblematicQuestion {
  attachments: Array<{ id: string; fileName: string; s3Key: string; mimeType: string; size: number; createdAt: string }>;
}

export interface ObjectOrg {
  id:           string;
  organizationId: string;
  organization: { id: string; name: string };
}

interface CreateInput {
  type:           ProblemIssueType;
  description:    string;
  causes?:        string;
  measuresTaken?: string;
  resolutionDate?: string;
  assigneeOrgId?: string;
  verifierOrgId?: string;
}

interface UpdateInput extends Partial<CreateInput> {
  status?: ProblemIssueStatus;
}

const QK = (objectId: string) => ['questions', objectId] as const;

export function useProblematicQuestions(objectId: string) {
  const query = useQuery<ProblematicQuestion[]>({
    queryKey: QK(objectId),
    queryFn: async () => {
      const res  = await fetch(`/api/projects/${objectId}/questions?limit=200`);
      const json = (await res.json()) as { success: boolean; data: { data: ProblematicQuestion[] } };
      if (!json.success) throw new Error('Ошибка загрузки вопросов');
      return json.data.data;
    },
    enabled: !!objectId,
  });

  return { questions: query.data ?? [], isLoading: query.isLoading };
}

export function useQuestionDetail(objectId: string, questionId: string | null) {
  return useQuery<ProblematicQuestionDetail>({
    queryKey: ['question-detail', objectId, questionId],
    queryFn: async () => {
      const res  = await fetch(`/api/projects/${objectId}/questions/${questionId!}`);
      const json = (await res.json()) as { success: boolean; data: ProblematicQuestionDetail };
      if (!json.success) throw new Error('Ошибка загрузки вопроса');
      return json.data;
    },
    enabled: !!objectId && !!questionId,
  });
}

export function useObjectOrgs(objectId: string) {
  return useQuery<ObjectOrg[]>({
    queryKey: ['object-orgs', objectId],
    queryFn: async () => {
      const res  = await fetch(`/api/projects/${objectId}/participants`);
      const json = (await res.json()) as { success: boolean; data: { orgs: ObjectOrg[] } };
      if (!json.success) throw new Error('Ошибка загрузки участников');
      return json.data.orgs;
    },
    enabled: !!objectId,
  });
}

export function useCreateQuestion(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateInput) => {
      const res = await fetch(`/api/projects/${objectId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания');
      return json.data as ProblematicQuestion;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK(objectId) });
      toast({ title: 'Вопрос добавлен' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useUpdateQuestion(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateInput & { id: string }) => {
      const res = await fetch(`/api/projects/${objectId}/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
      return json.data as ProblematicQuestionDetail;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: QK(objectId) });
      void qc.invalidateQueries({ queryKey: ['question-detail', objectId, vars.id] });
      toast({ title: 'Сохранено' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useDeleteQuestion(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${objectId}/questions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK(objectId) });
      toast({ title: 'Вопрос удалён' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
