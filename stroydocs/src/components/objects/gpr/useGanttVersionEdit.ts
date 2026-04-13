'use client';

import { useQuery } from '@tanstack/react-query';
import {
  useCreateVersion,
  useUpdateVersion,
  useCreateStage,
  type GanttVersionSummary,
  type GanttStageItem,
  type VersionUpdatePayload,
} from './useGanttStructure';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface ContractOption {
  id: string;
  number: string;
  name: string;
  participants: Array<{
    role: string;
    organization: { id: string; name: string };
  }>;
}

export interface OrgOption {
  id: string;
  name: string;
  inn: string;
}

export type VersionFormData = {
  name: string;
  stageId: string | null;
  contractId: string | null;
  // Актуальность: 'draft' | 'active' | 'archive'
  actuality: 'draft' | 'active' | 'archive';
  isDirective: boolean;
  delegatedFromOrgId: string | null;
  delegatedToOrgId: string | null;
  accessOrgIds: string[];
  lockWorks: boolean;
  lockPlan: boolean;
  lockFact: boolean;
  calculationMethod: string;
  disableVolumeRounding: boolean;
  allowOverplan: boolean;
  showSummaryRow: boolean;
  linkedVersionIds: string[];
};

// Маппинг актуальность → поля БД
export function actualityToDbFields(actuality: VersionFormData['actuality']): {
  isActive: boolean;
  isBaseline: boolean;
} {
  switch (actuality) {
    case 'active':  return { isActive: true,  isBaseline: false };
    case 'draft':   return { isActive: false, isBaseline: true  };
    case 'archive': return { isActive: false, isBaseline: false };
  }
}

// Маппинг полей БД → актуальность
export function dbFieldsToActuality(v: Pick<GanttVersionSummary, 'isActive' | 'isBaseline'>): VersionFormData['actuality'] {
  if (v.isActive) return 'active';
  if (v.isBaseline) return 'draft';
  return 'archive';
}

// Значения по умолчанию для нового диалога
export function defaultVersionForm(stageId: string | null): VersionFormData {
  return {
    name: '',
    stageId,
    contractId: null,
    actuality: 'active',
    isDirective: false,
    delegatedFromOrgId: null,
    delegatedToOrgId: null,
    accessOrgIds: [],
    lockWorks: false,
    lockPlan: false,
    lockFact: false,
    calculationMethod: 'MANUAL',
    disableVolumeRounding: true,
    allowOverplan: false,
    showSummaryRow: false,
    linkedVersionIds: [],
  };
}

// Заполнить форму из данных версии
export function versionToFormData(v: GanttVersionSummary): VersionFormData {
  return {
    name: v.name,
    stageId: v.stageId,
    contractId: v.contractId,
    actuality: dbFieldsToActuality(v),
    isDirective: v.isDirective,
    delegatedFromOrgId: v.delegatedFromOrgId,
    delegatedToOrgId: v.delegatedToOrgId,
    accessOrgIds: v.accessOrgIds ?? [],
    lockWorks: v.lockWorks,
    lockPlan: v.lockPlan,
    lockFact: v.lockFact,
    calculationMethod: v.calculationMethod ?? 'MANUAL',
    disableVolumeRounding: v.disableVolumeRounding,
    allowOverplan: v.allowOverplan,
    showSummaryRow: v.showSummaryRow,
    linkedVersionIds: v.linkedVersionIds ?? [],
  };
}

// ── Хуки для данных ────────────────────────────────────────────────────────────

export function useVersionEditContracts(objectId: string) {
  const { data, isLoading } = useQuery<ContractOption[]>({
    queryKey: ['gantt-edit-contracts', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/contracts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки договоров');
      return (json.data ?? []).map((c: { id: string; number: string; name: string; participants?: Array<{ role: string; organization: { id: string; name: string } }> }) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        participants: c.participants ?? [],
      }));
    },
    enabled: !!objectId,
  });
  return { contracts: data ?? [], isLoading };
}

export function useVersionEditOrgs(objectId: string) {
  const { data, isLoading } = useQuery<OrgOption[]>({
    queryKey: ['gantt-edit-orgs', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/gantt-orgs`);
      const json = await res.json();
      if (!res.ok) return [];
      return json.data ?? [];
    },
    enabled: !!objectId,
  });
  return { orgs: data ?? [], isLoading };
}

// ── Экспорт мутаций ────────────────────────────────────────────────────────────

export { useCreateVersion, useUpdateVersion, useCreateStage };
export type { GanttStageItem, GanttVersionSummary, VersionUpdatePayload };
