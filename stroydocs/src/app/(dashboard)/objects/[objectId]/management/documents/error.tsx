'use client';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" aria-label="Ошибка" />
      <p className="text-sm text-muted-foreground">
        {error.message || 'Произошла ошибка при загрузке документов'}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Попробовать снова
      </Button>
    </div>
  );
}
