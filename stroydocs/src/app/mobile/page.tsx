'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BuildingObject {
  id: string;
  name: string;
  address: string | null;
  status: string;
}

interface ApiResponse {
  success: boolean;
  data: BuildingObject[];
}

export default function MobilePage() {
  const router = useRouter();

  const { data, isLoading } = useQuery<BuildingObject[]>({
    queryKey: ['mobile-objects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      const json = (await res.json()) as ApiResponse;
      if (!json.success) throw new Error('Ошибка загрузки объектов');
      return json.data;
    },
  });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Объекты строительства</h1>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <p className="text-muted-foreground text-sm">Нет доступных объектов</p>
      )}

      {data?.map((obj) => (
        <button
          key={obj.id}
          onClick={() => router.push(`/mobile/journal?objectId=${obj.id}`)}
          className="w-full flex items-center gap-3 p-4 rounded-lg border bg-card text-left hover:bg-accent transition-colors"
        >
          <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{obj.name}</p>
            {obj.address && (
              <p className="text-xs text-muted-foreground truncate">{obj.address}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
