import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

/** Баннер «Режим хранения — редактирование запрещено» (ГОСТ Р 70108-2025) */
export function StorageModeBanner({ className }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800',
        className
      )}
    >
      <Lock className="h-4 w-4 shrink-0" />
      <span>Журнал в режиме хранения — редактирование запрещено</span>
    </div>
  );
}
