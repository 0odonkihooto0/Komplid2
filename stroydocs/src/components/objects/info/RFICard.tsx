import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Paperclip } from 'lucide-react';
import type { RFIListItem, RFIStatus, RFIPriority } from './useRFIList';

const PRIORITY_DOT: Record<RFIPriority, string> = {
  URGENT: 'bg-red-500',
  HIGH:   'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW:    'bg-gray-400',
};

const PRIORITY_LABEL: Record<RFIPriority, string> = {
  URGENT: 'СРОЧНО',
  HIGH:   'ВЫСОКИЙ',
  MEDIUM: 'СРЕДНИЙ',
  LOW:    'НИЗКИЙ',
};

const STATUS_BADGE: Record<RFIStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  OPEN:       { label: 'Открыт',           variant: 'outline' },
  IN_REVIEW:  { label: 'На рассмотрении',  variant: 'warning' },
  ANSWERED:   { label: 'Ответ дан',        variant: 'success' },
  CLOSED:     { label: 'Закрыт',           variant: 'secondary' },
  CANCELLED:  { label: 'Отменён',          variant: 'destructive' },
};

const FINAL_STATUSES: RFIStatus[] = ['ANSWERED', 'CLOSED', 'CANCELLED'];

function formatName(u: { firstName: string; lastName: string }) {
  return `${u.lastName} ${u.firstName.charAt(0)}.`;
}

interface Props {
  rfi: RFIListItem;
  onClick: () => void;
}

export function RFICard({ rfi, onClick }: Props) {
  const isOverdue =
    rfi.deadline &&
    new Date(rfi.deadline) < new Date() &&
    !FINAL_STATUSES.includes(rfi.status);

  const deadlineFormatted = rfi.deadline
    ? new Date(rfi.deadline).toLocaleDateString('ru-RU')
    : null;

  const statusCfg = STATUS_BADGE[rfi.status];

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        {/* Шапка: номер + приоритет */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted-foreground">{rfi.number}</span>
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[rfi.priority]}`} />
            <span className={`text-xs font-semibold ${rfi.priority === 'URGENT' ? 'text-red-600' : 'text-muted-foreground'}`}>
              {PRIORITY_LABEL[rfi.priority]}
            </span>
          </div>
        </div>

        {/* Заголовок */}
        <p className="font-medium leading-snug line-clamp-2">{rfi.title}</p>

        {/* Автор → Исполнитель */}
        <p className="text-xs text-muted-foreground">
          {formatName(rfi.author)}
          {rfi.assignee && (
            <> → <span className="text-foreground">{formatName(rfi.assignee)}</span></>
          )}
        </p>

        {/* Нижняя строка: статус + срок + вложения */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>

          {deadlineFormatted && (
            <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
              Срок: {deadlineFormatted}{isOverdue ? ' ⚠' : ''}
            </span>
          )}

          {rfi._count.attachments > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-auto">
              <Paperclip className="h-3 w-3" aria-label="Вложения" />
              {rfi._count.attachments}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
