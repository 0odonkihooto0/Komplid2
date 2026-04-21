import { getActivePlan } from './get-active-plan';
import { PaymentRequiredError } from './errors';
import type { FeatureKey } from './features';

export async function requireFeature(
  workspaceId: string,
  feature: FeatureKey
): Promise<void> {
  const active = await getActivePlan(workspaceId);
  if (!active) throw new PaymentRequiredError(feature, workspaceId);
  if (!active.plan.features.includes(feature)) {
    throw new PaymentRequiredError(feature, workspaceId);
  }
  // isInGracePeriod — даём доступ, UI покажет предупреждение
}

export async function hasFeature(
  workspaceId: string,
  feature: FeatureKey
): Promise<boolean> {
  try {
    await requireFeature(workspaceId, feature);
    return true;
  } catch {
    return false;
  }
}
