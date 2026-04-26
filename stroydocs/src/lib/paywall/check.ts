import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { requireFeature, hasFeature } from '@/lib/subscriptions/require-feature';
import type { FeatureCode } from '@/lib/features/codes';

export { requireFeature, hasFeature };

export interface FeatureAccessResult {
  allowed: boolean;
  remainingQuota: number | null;
  planCode: string | null;
  planName: string | null;
}

/** Серверная проверка доступа с возвратом информации о квоте и плане. */
export async function checkFeatureAccess(
  workspaceId: string,
  feature: FeatureCode
): Promise<FeatureAccessResult> {
  const active = await getActivePlan(workspaceId);
  if (!active) {
    return { allowed: false, remainingQuota: null, planCode: null, planName: null };
  }

  const features = Array.isArray(active.plan.features) ? (active.plan.features as string[]) : [];
  const allowed = features.includes(feature);

  // Квота: если у плана есть числовой лимит на фичу — возвращаем его
  const limits = (active.plan.limits as Record<string, number> | null) ?? {};
  const remainingQuota = typeof limits[feature] === 'number' ? limits[feature] : null;

  return {
    allowed,
    remainingQuota,
    planCode: active.plan.code,
    planName: active.plan.name,
  };
}
