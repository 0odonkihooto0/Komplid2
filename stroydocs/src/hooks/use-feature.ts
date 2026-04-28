'use client';

import { useActivePlan } from './use-active-plan';
import type { FeatureKey } from '@/lib/subscriptions/features';

export function useFeature(feature: FeatureKey): {
  hasAccess: boolean;
  isLoading: boolean;
  planCode: string | null;
} {
  const { data, isLoading } = useActivePlan();
  if (isLoading) return { hasAccess: false, isLoading: true, planCode: null };
  const features = Array.isArray(data?.plan?.features) ? (data.plan.features as string[]) : [];
  return {
    hasAccess: features.includes(feature),
    isLoading: false,
    planCode: data?.plan?.code ?? null,
  };
}
