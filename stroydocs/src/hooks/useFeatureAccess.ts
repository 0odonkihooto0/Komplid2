'use client';

import { useActivePlan } from './use-active-plan';
import type { FeatureCode } from '@/lib/features/codes';

export interface FeatureAccessState {
  hasAccess: boolean;
  isLoading: boolean;
  planName: string | null;
  planCode: string | null;
  /** null означает неограниченный или неприменимый лимит */
  remainingQuota: number | null;
}

export function useFeatureAccess(feature: FeatureCode): FeatureAccessState {
  const { data, isLoading } = useActivePlan();

  if (isLoading) {
    return { hasAccess: false, isLoading: true, planName: null, planCode: null, remainingQuota: null };
  }

  const features = Array.isArray(data?.plan?.features) ? (data.plan.features as string[]) : [];
  const hasAccess = features.includes(feature);

  // Квота: из поля limits плана, если задана для конкретной фичи
  const limits = (data?.plan?.limits as Record<string, number> | null) ?? {};
  const planLimit = typeof limits[feature] === 'number' ? limits[feature] : null;
  const usageValue = data?.usage?.[feature] ?? 0;
  const remainingQuota = planLimit !== null ? Math.max(0, planLimit - usageValue) : null;

  return {
    hasAccess,
    isLoading: false,
    planName: data?.plan?.name ?? null,
    planCode: data?.plan?.code ?? null,
    remainingQuota,
  };
}
