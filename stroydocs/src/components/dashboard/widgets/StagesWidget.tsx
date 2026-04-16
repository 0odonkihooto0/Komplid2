'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StageStat {
  stage: string;
  count: number;
}

interface AnalyticsData {
  implementationStages: StageStat[];
}

interface StageObject {
  id: string;
  name: string;
  project: { id: string; name: string };
}

interface Props {
  objectIds?: string[];
}

export function StagesWidget({ objectIds = [] }: Props) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const idsParam = objectIds.map((id) => `objectIds[]=${id}`).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics', objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics${idsParam ? `?${idsParam}` : ''}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: stageObjects = [], isLoading: objectsLoading } = useQuery<StageObject[]>({
    queryKey: ['dashboard-stages-objects', selectedStage, objectIds],
    queryFn: async () => {
      const params = new URLSearchParams({ stage: selectedStage! });
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/stages-objects?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedStage,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Стадии реализации</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-28 w-full" /></CardContent>
      </Card>
    );
  }

  const items = analytics?.implementationStages ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Стадии реализации (текущие)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет данных о стадиях</p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.stage}
                  type="button"
                  onClick={() => setSelectedStage(item.stage)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-muted/50 cursor-pointer"
                >
                  <span className="truncate text-left">{item.stage}</span>
                  <span className="ml-2 shrink-0 font-semibold tabular-nums text-primary">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог со списком объектов стадии */}
      <Dialog open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Стадия: {selectedStage}
            </DialogTitle>
          </DialogHeader>
          {objectsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : stageObjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет объектов на этой стадии</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Объект</th>
                  <th className="pb-2 font-medium text-muted-foreground">Стадия</th>
                </tr>
              </thead>
              <tbody>
                {stageObjects.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/objects/${s.project.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {s.project.name}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
