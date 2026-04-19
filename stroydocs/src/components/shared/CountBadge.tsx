'use client';

import { cn } from '@/lib/utils';
import { formatCount } from '@/utils/format';

interface Props {
  count?: number | null;
  className?: string;
}

export function CountBadge({ count, className }: Props) {
  if (count == null) return null;
  return (
    <span
      className={cn(
        'ml-auto font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded',
        className
      )}
    >
      {formatCount(count)}
    </span>
  );
}
