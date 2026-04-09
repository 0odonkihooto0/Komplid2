'use client';

import { cn } from '@/lib/utils';

interface StatusProgressBarProps {
  signed: number;
  total: number;
  className?: string;
}

/** Тонкая прогресс-полоса статуса ИД: зелёная=100%, жёлтая=1-99%, серая=0% */
export function StatusProgressBar({ signed, total, className }: StatusProgressBarProps) {
  if (total === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const percent = Math.round((signed / total) * 100);

  const barColor =
    percent === 100
      ? 'bg-green-500'
      : percent > 0
      ? 'bg-yellow-400'
      : 'bg-muted';

  const label =
    percent === 100 ? 'Подписано' : `${signed}/${total} подписано`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}
