import type { JournalStatus } from '@prisma/client';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JOURNAL_STATUS_LABELS, JOURNAL_STATUS_CLASS } from './journal-constants';

interface Props {
  status: JournalStatus;
  className?: string;
}

export function JournalStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        JOURNAL_STATUS_CLASS[status],
        className
      )}
    >
      {status === 'STORAGE' && <Lock className="h-3 w-3" />}
      {JOURNAL_STATUS_LABELS[status]}
    </span>
  );
}
