'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface SmrContract {
  id: string;
  number: string;
  name: string;
  projectId: string;
  projectName: string;
  workItemsTotal: number;
  workRecordsDone: number;
  progress: number;
}

export function SmrProgressWidget() {
  const { data, isLoading } = useQuery<SmrContract[]>({
    queryKey: ['dashboard-smr-progress'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/smr-progress');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Прогресс СМР</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  const contracts = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Прогресс СМР</CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет активных договоров</p>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <Link
                key={c.id}
                href={`/objects/${c.projectId}/contracts/${c.id}`}
                className="block rounded-md px-1 py-0.5 hover:bg-muted"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate max-w-[160px] font-medium">
                    {c.number} — {c.name}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold text-primary">
                    {c.progress}%
                  </span>
                </div>
                <Progress value={c.progress} className="h-1.5" />
                <p className="mt-0.5 text-muted-foreground" style={{ fontSize: 10 }}>
                  {c.workRecordsDone} из {c.workItemsTotal} видов работ выполнено
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
