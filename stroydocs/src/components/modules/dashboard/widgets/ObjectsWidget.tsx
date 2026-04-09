'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

interface ObjectSummary {
  id: string;
  name: string;
  address: string | null;
  status: string;
  contractsCount: number;
  totalDocs: number;
  signedDocs: number;
  idReadinessPct: number;
}

const statusLabel: Record<string, string> = {
  ACTIVE: 'Активный',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
  ARCHIVED: 'outline',
};

interface ObjectsWidgetProps {
  objectIds?: string[];
}

export function ObjectsWidget({ objectIds }: ObjectsWidgetProps) {
  const { data, isLoading } = useQuery<ObjectSummary[]>({
    queryKey: ['dashboard-objects-summary', objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (objectIds && objectIds.length > 0) {
        params.set('objectIds', objectIds.join(','));
      }
      const qs = params.size > 0 ? `?${params.toString()}` : '';
      const res = await fetch(`/api/dashboard/objects-summary${qs}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Объекты строительства</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const objects = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-primary" />
          Объекты строительства
        </CardTitle>
      </CardHeader>
      <CardContent>
        {objects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет объектов строительства</p>
        ) : (
          <div className="space-y-3">
            {objects.map((obj) => (
              <Link
                key={obj.id}
                href={`/objects/${obj.id}`}
                className="block rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-medium truncate max-w-[180px]">
                    {obj.name}
                  </span>
                  <Badge variant={statusVariant[obj.status] ?? 'outline'} className="text-[10px] h-4 shrink-0">
                    {statusLabel[obj.status] ?? obj.status}
                  </Badge>
                </div>
                {obj.address && (
                  <p className="text-[10px] text-muted-foreground truncate mb-1">{obj.address}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{obj.contractsCount} {obj.contractsCount === 1 ? 'договор' : 'договоров'}</span>
                  <span className="font-semibold text-primary">{obj.idReadinessPct}% ИД готово</span>
                </div>
                <Progress value={obj.idReadinessPct} className="h-1" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
