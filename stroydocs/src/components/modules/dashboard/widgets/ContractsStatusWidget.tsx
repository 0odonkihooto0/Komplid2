'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { ContractStatus } from '@prisma/client';

interface RecentContract {
  id: string;
  number: string;
  name: string;
  status: ContractStatus;
  updatedAt: string;
  buildingObject: { id: string; name: string };
}

interface DashboardStats { recentContracts: RecentContract[] }

export function ContractsStatusWidget() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      return json.success ? json.data : { recentContracts: [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Активные договоры</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  const contracts = data?.recentContracts ?? [];

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Активные договоры</CardTitle></CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет договоров</p>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <Link
                key={c.id}
                href={`/objects/${c.buildingObject.id}/contracts/${c.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.number} — {c.name}</p>
                  <p className="text-muted-foreground">{c.buildingObject.name}</p>
                </div>
                <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                  <StatusBadge status={c.status} label={CONTRACT_STATUS_LABELS[c.status]} />
                  <span className="text-muted-foreground">{formatDate(c.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
