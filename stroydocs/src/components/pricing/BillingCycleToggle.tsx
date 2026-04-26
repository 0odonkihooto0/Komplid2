'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

interface Props {
  value: BillingCycle;
  onChange: (value: BillingCycle) => void;
}

export function BillingCycleToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-1 bg-muted">
      <button
        type="button"
        onClick={() => onChange('MONTHLY')}
        className={cn(
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          value === 'MONTHLY'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Месяц
      </button>
      <button
        type="button"
        onClick={() => onChange('YEARLY')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          value === 'YEARLY'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Год
        <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-0">
          –20%
        </Badge>
      </button>
    </div>
  );
}
