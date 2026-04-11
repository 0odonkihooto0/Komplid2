'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ActivitiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Перезагружаем страницу при ошибке Server Action ID (устаревший деплой)
    if (error.message?.includes('Failed to find Server Action')) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">
        Ошибка загрузки перечня мероприятий
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Обновить
      </Button>
    </div>
  );
}
