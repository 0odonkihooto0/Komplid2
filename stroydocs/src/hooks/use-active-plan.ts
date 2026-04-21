'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import type { SubscriptionPlan, Subscription } from '@prisma/client';

interface ActivePlanResponse {
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  isInGracePeriod: boolean;
  usage: Record<string, number>;
}

export function useActivePlan() {
  const { data: session } = useSession();
  return useQuery<ActivePlanResponse>({
    queryKey: ['active-plan', session?.user?.activeWorkspaceId],
    queryFn: async () => {
      const r = await fetch('/api/workspaces/active/subscription');
      if (!r.ok) throw new Error('Failed to fetch active plan');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ActivePlanResponse;
    },
    enabled: !!session?.user?.activeWorkspaceId,
    staleTime: 60_000,
  });
}
