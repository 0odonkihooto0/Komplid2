'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface IdFunnel {
  workRecords: number;
  docsTotal: number;
  docsInReview: number;
  docsSigned: number;
}

interface ObjectSummary { id: string; name: string }

interface Props { projectId?: string }

export function IdReadinessWidget({ projectId: configProjectId }: Props) {
  // Если projectId не задан в конфиге — берём первый активный объект организации
  const { data: objectsData, isLoading: objectsLoading } = useQuery<ObjectSummary[]>({
    queryKey: ['dashboard-objects-summary-mini'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/objects-summary');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !configProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const projectId = configProjectId ?? objectsData?.[0]?.id;
  const autoObjectName = !configProjectId ? objectsData?.[0]?.name : undefined;

  const { data, isLoading: analyticsLoading } = useQuery<{ idFunnel: IdFunnel }>({
    queryKey: ['project-analytics', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/analytics`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = objectsLoading || analyticsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Готовность ИД</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Готовность ИД</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Нет активных объектов</p></CardContent>
      </Card>
    );
  }

  const funnel = data?.idFunnel;
  if (!funnel) return null;

  const items = [
    { label: 'Записи о работах', value: funnel.workRecords, color: 'bg-blue-400' },
    { label: 'Создано ИД', value: funnel.docsTotal, color: 'bg-indigo-400' },
    { label: 'На согласовании', value: funnel.docsInReview, color: 'bg-yellow-400' },
    { label: 'Подписано', value: funnel.docsSigned, color: 'bg-green-500' },
  ];
  const max = funnel.workRecords || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Воронка ИД
          {autoObjectName && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">— {autoObjectName}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const pct = Math.round((item.value / max) * 100);
          return (
            <div key={item.label}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
