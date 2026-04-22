'use client';

import { useQuery } from '@tanstack/react-query';

export interface BillingStats {
  mrr: number;
  arr: number;
  churnRate: number;
  activeCount: number;
  trialCount: number;
  pastDueCount: number;
  churnedLast30: number;
  newLast30d: number;
}

// Статистика биллинга: MRR, ARR, churn и счётчики
export function useAdminBillingStats() {
  return useQuery<BillingStats>({
    queryKey: ['admin-billing-stats'],
    queryFn: async () => {
      const r = await fetch('/api/admin/billing/stats');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data as BillingStats;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
