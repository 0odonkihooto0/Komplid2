'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeature } from '@/hooks/use-feature';

interface AosrStats {
  totalThisMonth: number;
  signedThisMonth: number;
  inProgress: number;
  signedPercent: number;
}

export function AosrStatsWidget() {
  const { hasAccess } = useFeature('execution_docs');

  const { data } = useQuery<AosrStats>({
    queryKey: ['dashboard-aosr-stats'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard/aosr-stats');
      const json = await r.json();
      return json.success ? json.data : null;
    },
    staleTime: 60_000,
    enabled: hasAccess,
  });

  if (!hasAccess || !data) return null;

  const kpis = [
    {
      label: 'АОСР за месяц',
      value: data.totalThisMonth,
      Icon: FileText,
      color: 'text-blue-600',
    },
    {
      label: '% согласованных',
      value: `${data.signedPercent}%`,
      Icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      label: 'В работе',
      value: data.inProgress,
      Icon: Clock,
      color: 'text-amber-600',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Исполнительная документация (АОСР)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {kpis.map(({ label, value, Icon, color }) => (
            <div key={label} className="space-y-1">
              <div className={`flex items-center gap-1.5 ${color}`}>
                <Icon className="h-4 w-4" />
                <span className="text-xl font-bold">{value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
