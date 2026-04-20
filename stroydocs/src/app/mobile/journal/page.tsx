'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Journal {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Journal[];
}

export default function MobileJournalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const objectId = searchParams.get('objectId') ?? '';

  const { data, isLoading } = useQuery<Journal[]>({
    queryKey: ['mobile-journals', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/journals`);
      const json = (await res.json()) as ApiResponse;
      if (!json.success) throw new Error('Ошибка загрузки журналов');
      return json.data;
    },
    enabled: !!objectId,
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Журналы</h1>
      </div>

      {!objectId && (
        <p className="text-muted-foreground text-sm">Выберите объект на главной странице</p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <p className="text-muted-foreground text-sm">Журналы не найдены</p>
      )}

      {data?.map((journal) => (
        <button
          key={journal.id}
          onClick={() => router.push(`/mobile/journal/${journal.id}/new?objectId=${objectId}`)}
          className="w-full flex items-center gap-3 p-4 rounded-lg border bg-card text-left hover:bg-accent transition-colors"
        >
          <BookOpen className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{journal.name}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(journal.updatedAt), 'd MMM yyyy', { locale: ru })}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
