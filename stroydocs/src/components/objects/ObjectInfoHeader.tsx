'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

interface ObjectSummaryData {
  object: { id: string; name: string; status: string; address: string | null };
}

interface Props {
  objectId: string;
}

export function ObjectInfoHeader({ objectId }: Props) {
  const router = useRouter();

  const { data: summary } = useQuery<ObjectSummaryData>({
    queryKey: ['object-summary', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/summary`);
      const json = await res.json() as { success: boolean; data: ObjectSummaryData; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const objectName = summary?.object.name ?? '…';
  const objectAddress = summary?.object.address;

  return (
    <div className="mb-4 rounded-lg border bg-background px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base leading-tight truncate">{objectName}</p>
          {objectAddress && (
            <p className="text-xs text-muted-foreground truncate">{objectAddress}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/objects/${objectId}/passport`)}
          className="shrink-0"
        >
          + Редактировать
        </Button>
      </div>
    </div>
  );
}
