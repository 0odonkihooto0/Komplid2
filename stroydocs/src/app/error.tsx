'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // После деплоя у пользователей с открытыми вкладками Server Action ID устаревают.
    // Принудительная перезагрузка получает актуальную страницу с новыми ID.
    if (error.message.includes('Failed to find Server Action')) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Произошла ошибка</h1>
      <p className="mt-2 text-muted-foreground">{error.message || 'Что-то пошло не так'}</p>
      <Button onClick={reset} className="mt-4">
        Попробовать снова
      </Button>
    </div>
  );
}
