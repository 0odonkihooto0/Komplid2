'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface IdQualityData {
  signed: number;
  total: number;
  ratio: number;
  byStatus: { status: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  SIGNED: 'Подписано',
  IN_REVIEW: 'На согласовании',
  DRAFT: 'Черновики',
  REJECTED: 'Отклонено',
};

const STATUS_COLORS: Record<string, string> = {
  SIGNED: '#10b981',
  IN_REVIEW: '#f59e0b',
  DRAFT: '#94a3b8',
  REJECTED: '#ef4444',
};

export function IdQualityWidget() {
  const { data, isLoading } = useQuery<IdQualityData>({
    queryKey: ['dashboard-id-quality'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/id-quality');
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Качество ИД</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Круговой индикатор прогресса через SVG
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (data.ratio / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Качество ИД</CardTitle>
      </CardHeader>
      <CardContent>
        {data.total === 0 ? (
          <p className="text-xs text-muted-foreground">Документов ещё нет</p>
        ) : (
          <div className="flex items-center gap-4">
            {/* Круговой индикатор */}
            <div className="relative shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7" />
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold leading-none">{data.ratio}%</span>
              </div>
            </div>

            {/* Статусы */}
            <div className="flex-1 space-y-1">
              {data.byStatus
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[s.status] ?? '#94a3b8' }}
                      />
                      <span className="text-muted-foreground">
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Подписано: <strong className="text-foreground">{data.signed}</strong> из{' '}
          <strong className="text-foreground">{data.total}</strong> актов
        </p>
      </CardContent>
    </Card>
  );
}
