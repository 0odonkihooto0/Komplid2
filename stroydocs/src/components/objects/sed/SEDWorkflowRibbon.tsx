'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SEDWorkflowItem } from './useSEDDocumentCard';

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  DELEGATION:      'Делегирование',
  APPROVAL:        'Согласование',
  REDIRECT:        'Перенаправление',
  REVIEW:          'Рассмотрение',
  SIGNING:         'Подписание',
  EXECUTION:       'Исполнение',
  FAMILIARIZATION: 'Ознакомление',
};

const WORKFLOW_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  CREATED:     { label: 'Создан',     variant: 'outline' },
  IN_PROGRESS: { label: 'В работе',   variant: 'warning' },
  APPROVED:    { label: 'Согласован', variant: 'success' },
  REJECTED:    { label: 'Отклонён',  variant: 'destructive' },
  COMPLETED:   { label: 'Завершён',  variant: 'secondary' },
};

interface SEDWorkflowRibbonProps {
  workflows: SEDWorkflowItem[];
  activeWorkflowId: string | null;
  onSelect: (id: string) => void;
}

export function SEDWorkflowRibbon({ workflows, activeWorkflowId, onSelect }: SEDWorkflowRibbonProps) {
  return (
    <div className="border-b bg-muted/30 px-6 py-2 shrink-0">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {workflows.map((wf) => (
          <button
            key={wf.id}
            onClick={() => onSelect(wf.id)}
            className={cn(
              'flex-shrink-0 cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition-colors',
              activeWorkflowId === wf.id
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-border bg-background hover:bg-muted'
            )}
          >
            <div className="font-medium">{WORKFLOW_TYPE_LABELS[wf.workflowType] ?? wf.workflowType}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={WORKFLOW_STATUS[wf.status]?.variant ?? 'outline'} className="text-xs">
                {WORKFLOW_STATUS[wf.status]?.label ?? wf.status}
              </Badge>
              {wf.sentAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(wf.sentAt).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
