'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  isRequired: boolean;
  isChecked: boolean;
  sortOrder: number;
}

export interface HiddenWorksChecklist {
  id: string;
  workType: string;
  title: string;
  status: string;
  items: ChecklistItem[];
  completedAt?: string | null;
}

interface Props {
  checklist: HiddenWorksChecklist;
}

// Маппинг статуса чек-листа на вариант бейджа
function statusVariant(status: string): 'default' | 'success' | 'warning' | 'secondary' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'secondary';
}

function statusLabel(status: string): string {
  if (status === 'COMPLETED') return 'Завершён';
  if (status === 'IN_PROGRESS') return 'В работе';
  return 'Ожидает';
}

export default function CustomerChecklistCard({ checklist }: Props) {
  const total = checklist.items.length;
  const checked = checklist.items.filter(i => i.isChecked).length;
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-sm">{checklist.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{checklist.workType}</p>
        </div>
        <Badge variant={statusVariant(checklist.status)}>{statusLabel(checklist.status)}</Badge>
      </div>

      {/* Прогресс выполнения пунктов */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Выполнено: {checked} / {total}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Список пунктов (только отображение) */}
      <ul className="space-y-1.5">
        {checklist.items.sort((a, b) => a.sortOrder - b.sortOrder).map(item => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${item.isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
              {item.isChecked ? '✓' : ''}
            </span>
            <span className={item.isChecked ? 'line-through text-muted-foreground' : ''}>
              {item.title}
              {item.isRequired && <span className="ml-1 text-destructive">*</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
