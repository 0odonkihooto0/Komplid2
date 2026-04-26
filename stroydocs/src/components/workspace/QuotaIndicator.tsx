'use client';

import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface QuotaIndicatorProps {
  used: number;
  total: number | null;
}

/** Индикатор использования мест по тарифу */
export function QuotaIndicator({ used, total }: QuotaIndicatorProps) {
  if (total === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Участников: <span className="font-medium">{used}</span> (безлимит)
      </p>
    );
  }

  const pct = Math.min(100, Math.round((used / total) * 100));
  const isExceeded = used >= total;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Используется <span className="font-medium text-foreground">{used}</span> из{' '}
          <span className="font-medium text-foreground">{total}</span> мест
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      {isExceeded && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>Лимит участников исчерпан. Перейдите на тариф выше, чтобы пригласить новых.</span>
            <Button asChild size="sm" variant="destructive" className="ml-4 shrink-0">
              <Link href="/subscriptions">Улучшить тариф →</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
