'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ApprovalTemplate, PIREntityType } from './types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

// ---------- useTemplates ----------

/**
 * Список шаблонов маршрутов согласования организации, отфильтрованных по типу сущности.
 * Шаблоны ЗП и ЗИИ разные — фильтр по entityType обязателен.
 */
export function useTemplates(orgId: string, entityType: PIREntityType) {
  return useQuery<ApprovalTemplate[]>({
    queryKey: ['approval-templates', orgId, entityType],
    queryFn: async () => {
      const res = await fetch(
        `/api/organizations/${orgId}/approval-templates?entityType=${entityType}`
      );
      if (!res.ok) throw new Error('Ошибка загрузки шаблонов');
      const json: ApiResponse<ApprovalTemplate[]> = await res.json();
      return json.data;
    },
    enabled: !!orgId,
  });
}

// ---------- useEmployees ----------

/**
 * Список сотрудников организации — для выбора участников уровней шаблона.
 */
export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      if (!res.ok) throw new Error('Ошибка загрузки сотрудников');
      const json: ApiResponse<Employee[]> = await res.json();
      return json.data;
    },
  });
}

// ---------- useApplyTemplate ----------

interface ApplyTemplateParams {
  orgId: string;
  templateId: string;
  entityType: PIREntityType;
  entityId: string;
}

/**
 * Применить шаблон к сущности — создаёт ApprovalRoute + ApprovalSteps с предназначенными userId.
 */
export function useApplyTemplate(queryKey: unknown[], onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, templateId, entityType, entityId }: ApplyTemplateParams) => {
      const res = await fetch(
        `/api/organizations/${orgId}/approval-templates/${templateId}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType, entityId }),
        }
      );
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка запуска согласования');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования запущен' });
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });
}

// ---------- useCreateTemplate ----------

interface CreateTemplateParams {
  orgId: string;
  name: string;
  description?: string;
  entityType: PIREntityType;
}

interface CreateTemplateLevelParams {
  orgId: string;
  templateId: string;
  level: number;
  userId: string;
  requiresPreviousApproval: boolean;
}

/**
 * Создать шаблон и все его уровни последовательно.
 * Возвращает ID созданного шаблона.
 */
export function useCreateTemplateWithLevels(queryKey: unknown[]) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateParams,
      levels,
    }: {
      templateParams: CreateTemplateParams;
      levels: Array<{ userId: string; requiresPreviousApproval: boolean }>;
    }) => {
      // 1. Создать шаблон
      const tplRes = await fetch(
        `/api/organizations/${templateParams.orgId}/approval-templates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateParams.name,
            description: templateParams.description,
            entityType: templateParams.entityType,
          }),
        }
      );
      if (!tplRes.ok) {
        const err: { error?: string } = await tplRes.json();
        throw new Error(err.error ?? 'Ошибка создания шаблона');
      }
      const tplJson: ApiResponse<{ id: string }> = await tplRes.json();
      const templateId = tplJson.data.id;

      // 2. Добавить уровни последовательно
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        const lvlRes = await fetch(
          `/api/organizations/${templateParams.orgId}/approval-templates/${templateId}/levels`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              level: i,
              userId: lvl.userId,
              requiresPreviousApproval: lvl.requiresPreviousApproval,
            } satisfies Omit<CreateTemplateLevelParams, 'orgId' | 'templateId'>),
          }
        );
        if (!lvlRes.ok) {
          const err: { error?: string } = await lvlRes.json();
          throw new Error(err.error ?? `Ошибка создания уровня ${i + 1}`);
        }
      }

      return templateId;
    },
    onSuccess: () => {
      toast({ title: 'Шаблон создан' });
      queryClient.invalidateQueries({ queryKey: ['approval-templates'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });
}
