import type { SpecialJournalType } from '@prisma/client';
import { cn } from '@/lib/utils';
import { JOURNAL_TYPE_LABELS, JOURNAL_TYPE_CLASS } from './journal-constants';

interface Props {
  type: SpecialJournalType;
  className?: string;
}

export function JournalTypeBadge({ type, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        JOURNAL_TYPE_CLASS[type],
        className
      )}
    >
      {JOURNAL_TYPE_LABELS[type]}
    </span>
  );
}
