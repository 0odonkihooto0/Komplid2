import { useQuery } from '@tanstack/react-query';
import type { MonitoringObject } from '@/app/api/organizations/[orgId]/monitoring/route';

export type { MonitoringObject };

async function fetchMonitoring(orgId: string): Promise<MonitoringObject[]> {
  const res = await fetch(`/api/organizations/${orgId}/monitoring`);
  if (!res.ok) throw new Error('Ошибка загрузки данных мониторинга');
  const json = await res.json() as { data: MonitoringObject[] };
  return json.data;
}

export function useGlobalMonitoring(orgId: string | undefined) {
  return useQuery({
    queryKey: ['monitoring', orgId],
    queryFn: () => fetchMonitoring(orgId!),
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
