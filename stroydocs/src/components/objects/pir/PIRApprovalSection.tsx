'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';

interface ApprovalStep {
  id: string;
  stepIndex: number;
  role: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string | null;
  user: { id: string; firstName: string; lastName: string } | null;
}

export interface PIRApprovalRoute {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
  currentStepIdx: number;
  steps: ApprovalStep[];
}

interface Props {
  projectId: string;
  taskId: string;
  approvalRoute: PIRApprovalRoute | null;
  taskStatus: string;
}

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER:     'Застройщик',
  CONTRACTOR:    'Подрядчик',
  SUPERVISION:   'Стройконтроль',
  SUBCONTRACTOR: 'Субподрядчик',
};

const STEP_STATUS_CONFIG = {
  WAITING:  { dotClass: 'bg-yellow-400 border-yellow-500', label: 'Ожидает' },
  APPROVED: { dotClass: 'bg-green-500 border-green-600',  label: 'Согласовано' },
  REJECTED: { dotClass: 'bg-red-500 border-red-600',      label: 'Отклонено' },
};

export function PIRApprovalSection({ projectId, taskId, approvalRoute, taskStatus }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workflowUrl = `/api/objects/${projectId}/design-tasks/${taskId}/workflow`;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['design-task', taskId] });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(workflowUrl, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка запуска согласования');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования запущен' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const canStart =
    !approvalRoute ||
    approvalRoute.status === 'RESET' ||
    approvalRoute.status === 'REJECTED';
  const isTerminal = taskStatus === 'APPROVED' || taskStatus === 'CANCELLED';

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Маршрут согласования</h3>
        {canStart && !isTerminal && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            {approvalRoute ? 'Перезапустить' : 'Запустить'}
          </Button>
        )}
        {approvalRoute?.status === 'PENDING' && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Сбросить
          </Button>
        )}
      </div>

      {!approvalRoute && (
        <p className="text-sm text-muted-foreground">
          Маршрут согласования не запущен. Нажмите «Запустить», чтобы отправить задание на согласование.
        </p>
      )}

      {approvalRoute && (
        <>
          {/* Статус маршрута */}
          {approvalRoute.status === 'APPROVED' && (
            <Badge className="bg-green-100 text-green-800">Согласован</Badge>
          )}
          {approvalRoute.status === 'REJECTED' && (
            <Badge variant="destructive">Отклонён</Badge>
          )}
          {approvalRoute.status === 'RESET' && (
            <Badge variant="secondary">Сброшен</Badge>
          )}
          {approvalRoute.status === 'PENDING' && (
            <Badge className="bg-yellow-100 text-yellow-800">На согласовании</Badge>
          )}

          {/* Вертикальный timeline шагов */}
          <div className="relative ml-3.5 space-y-0">
            {approvalRoute.steps.map((step, idx) => {
              const isActive =
                approvalRoute.status === 'PENDING' && idx === approvalRoute.currentStepIdx;
              const config = STEP_STATUS_CONFIG[step.status];
              const isLast = idx === approvalRoute.steps.length - 1;

              return (
                <div key={step.id} className="relative flex gap-4 pb-5">
                  {/* Вертикальная линия */}
                  {!isLast && (
                    <div className="absolute bottom-0 left-3 top-7 w-0.5 bg-border" />
                  )}

                  {/* Круг статуса */}
                  <div className="relative mt-0.5 flex-shrink-0">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border-2',
                        config.dotClass,
                        isActive && 'animate-pulse ring-2 ring-blue-500 ring-offset-2'
                      )}
                    >
                      <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                    </div>
                  </div>

                  {/* Содержимое шага */}
                  <div
                    className={cn(
                      'flex-1 rounded-md px-3 py-2',
                      isActive ? 'border border-blue-200 bg-blue-50' : 'bg-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {ROLE_LABELS[step.role] || step.role}
                      </span>
                      {isActive && (
                        <Badge className="ml-auto bg-blue-100 text-xs text-blue-800">Текущий</Badge>
                      )}
                      <Badge variant="outline" className="ml-auto text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    {step.user && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.user.lastName} {step.user.firstName}
                      </p>
                    )}
                    {step.decidedAt && (
                      <p className="text-xs text-muted-foreground">{formatDate(step.decidedAt)}</p>
                    )}
                    {step.comment && (
                      <p className="mt-1 text-xs italic text-muted-foreground">«{step.comment}»</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
