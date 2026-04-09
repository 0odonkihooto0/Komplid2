'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ConstructionProgressCategory } from '@/app/api/dashboard/construction-progress/route';

export function ConstructionProgressWidget() {
  const { data, isLoading } = useQuery<ConstructionProgressCategory[]>({
    queryKey: ['dashboard-construction-progress'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/construction-progress');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ход строительства</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  const categories = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ход строительства</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет активных договоров с видами работ</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate max-w-[200px] font-medium" title={cat.category}>
                    {cat.category}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold text-primary">
                    {cat.progress}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                    style={{ width: `${cat.progress}%` }}
                  />
                </div>
                <p className="mt-0.5 text-muted-foreground" style={{ fontSize: 10 }}>
                  {cat.completed} из {cat.total} видов работ выполнено
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
