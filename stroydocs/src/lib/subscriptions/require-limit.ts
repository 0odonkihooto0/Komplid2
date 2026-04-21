import { getActivePlan } from './get-active-plan';
import { LimitExceededError } from './errors';

export async function requireLimit(
  workspaceId: string,
  limitKey: string,
  currentUsage: number
): Promise<void> {
  const active = await getActivePlan(workspaceId);
  if (!active) throw new LimitExceededError(limitKey, 0, currentUsage, workspaceId);

  const limits = active.plan.limits as Record<string, number>;
  const limit = limits?.[limitKey];
  if (limit === undefined) return; // лимит не задан = безлимит
  if (limit === -1) return;        // -1 = явный безлимит
  if (currentUsage >= limit) {
    throw new LimitExceededError(limitKey, limit, currentUsage, workspaceId);
  }
}
