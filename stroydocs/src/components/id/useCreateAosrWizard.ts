'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface AosrTemplate {
  id: string;
  name: string;
  workType: string | null;
  description: string | null;
}

export interface AosrWizardFormData {
  templateId: string;
  contractorName: string;
  hideAutonadzor: boolean;
  hideTechnadzor: boolean;
  workName: string;
  unit: string;
  volume: string;
  dateFrom: string;
  dateTo: string;
  normativeDoc: string;
}

const INITIAL_FORM: AosrWizardFormData = {
  templateId: '',
  contractorName: '',
  hideAutonadzor: false,
  hideTechnadzor: false,
  workName: '',
  unit: '',
  volume: '',
  dateFrom: '',
  dateTo: '',
  normativeDoc: '',
};

interface UseCreateAosrWizardProps {
  projectId: string;
  contractId: string;
  isPersonalWorkspace: boolean;
  onSuccess: (docId: string) => void;
}

export function useCreateAosrWizard({
  projectId,
  contractId,
  isPersonalWorkspace,
  onSuccess,
}: UseCreateAosrWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<AosrWizardFormData>({
    ...INITIAL_FORM,
    hideAutonadzor: isPersonalWorkspace,
    hideTechnadzor: isPersonalWorkspace,
  });
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<AosrTemplate[]>({
    queryKey: ['aosr-templates'],
    queryFn: async () => {
      const r = await fetch('/api/templates?category=AOSR');
      const json = await r.json();
      return json.success ? json.data : [];
    },
    staleTime: 5 * 60_000,
  });

  const workTypes = Array.from(
    new Set(templates.map((t) => t.workType).filter(Boolean) as string[])
  );

  const filteredTemplates = workTypeFilter
    ? templates.filter((t) => t.workType === workTypeFilter)
    : templates;

  const createMutation = useMutation({
    mutationFn: async () => {
      const overrideFields = {
        templateId: form.templateId,
        workName: form.workName,
        unit: form.unit,
        volume: form.volume ? parseFloat(form.volume) : undefined,
        dateFrom: form.dateFrom || undefined,
        dateTo: form.dateTo || undefined,
        normativeDoc: form.normativeDoc || undefined,
        contractorName: form.contractorName || undefined,
        hideAutonadzor: form.hideAutonadzor,
        hideTechnadzor: form.hideTechnadzor,
      };

      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/execution-docs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'AOSR',
            title: form.workName || 'АОСР',
            overrideFields,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания');
      return json.data as { id: string };
    },
    onSuccess: (data) => {
      toast({ title: 'АОСР создан', description: `Документ № создан в черновиках` });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      onSuccess(data.id);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const updateForm = (patch: Partial<AosrWizardFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const canProceedStep1 = !!form.templateId;
  const canProceedStep2 = true;
  const canSubmit = !!form.workName;

  return {
    step,
    setStep,
    form,
    updateForm,
    workTypeFilter,
    setWorkTypeFilter,
    workTypes,
    templates: filteredTemplates,
    allTemplates: templates,
    loadingTemplates,
    createMutation,
    canProceedStep1,
    canProceedStep2,
    canSubmit,
  };
}
