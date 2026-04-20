import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * Chip — фирменный статус-чип дизайн-системы Komplid.
 * Моноширинный шрифт, 10px, uppercase, точка-маркер слева.
 * Варианты отражают семантические токены: ok/warn/err/info/accent/neutral.
 */
const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 font-mono text-xs2 font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-bg-inset text-ink-soft border border-border-token',
        accent: 'bg-[color-mix(in_oklch,var(--accent-bg)_18%,transparent)] text-[var(--accent-bg)]',
        ok: 'bg-[color-mix(in_oklch,var(--ok)_18%,transparent)] text-[var(--ok)]',
        warn: 'bg-[color-mix(in_oklch,var(--warn)_20%,transparent)] text-[var(--warn)]',
        err: 'bg-[color-mix(in_oklch,var(--err)_18%,transparent)] text-[var(--err)]',
        info: 'bg-[color-mix(in_oklch,var(--info)_18%,transparent)] text-[var(--info)]',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      dot: true,
    },
  }
);

const dotColorMap: Record<NonNullable<VariantProps<typeof chipVariants>['variant']>, string> = {
  neutral: 'bg-[var(--ink-muted)]',
  accent: 'bg-[var(--accent-bg)]',
  ok: 'bg-[var(--ok)]',
  warn: 'bg-[var(--warn)]',
  err: 'bg-[var(--err)]',
  info: 'bg-[var(--info)]',
};

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

function Chip({ className, variant, dot = true, children, ...props }: ChipProps) {
  const resolvedVariant = variant ?? 'neutral';
  return (
    <span className={cn(chipVariants({ variant: resolvedVariant, dot }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 shrink-0 rounded-pill',
            dotColorMap[resolvedVariant]
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Chip, chipVariants };
