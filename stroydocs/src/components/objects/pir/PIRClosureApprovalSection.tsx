'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { PIRClosureApprovalRoute } from './usePIRClosureDetail';
import type { PIRClosureStatus } from '@prisma/client';

interface Props {
  projectId: string;
  actId: string;
  approvalRoute: PIRClosureApprovalRoute | null;
  actStatus: PIRClosureStatus;
  onStartWorkflow: () => void;
  isStarting: boolean;
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

const ROUTE_STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Согласован',       cls: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Отклонён',         cls: 'destructive' },
  RESET:    { label: 'Сброшен',          cls: '' },
  PENDING:  { label: 'На согласовании',  cls: 'bg-yellow-100 text-yellow-800' },
};

export function PIRClosureApprovalSection({
  approvalRoute,
  actStatus,
  onStartWorkflow,
  isStarting,
}: Props) {
  // Запуск согласования доступен только из статуса CONDUCTED
  const canStart =
    actStatus === 'CONDUCTED' &&
    (!approvalRoute || approvalRoute.status === 'RESET' || approvalRoute.status === 'REJECTED');

  const isTerminal = actStatus === 'SIGNED';

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Маршрут согласования</h3>
        {canStart && !isTerminal && (
          <Button size="sm" variant="outline" onClick={onStartWorkflow} disabled={isStarting}>
            <Play className="mr-1 h-3.5 w-3.5" />
            {approvalRoute ? 'Перезапустить' : 'Запустить'}
          </Button>
        )}
      </div>

      {!approvalRoute && (
        <p className="text-sm text-muted-foreground">
          {actStatus === 'DRAFT'
            ? 'Сначала проведите акт, затем запустите согласование.'
            : 'Маршрут согласования не запущен. Нажмите «Запустить».'}
        </p>
      )}

      {approvalRoute && (
        <>
          {/* Общий статус маршрута */}
          {(() => {
            const badge = ROUTE_STATUS_BADGES[approvalRoute.status];
            return badge.cls === 'destructive' ? (
              <Badge variant="destructive">{badge.label}</Badge>
            ) : (
              <Badge className={cn(badge.cls)}>{badge.label}</Badge>
            );
          })()}

          {/* Вертикальный timeline шагов */}
          <div className="relative ml-3.5 space-y-0">
            {approvalRoute.steps.map((step, idx) => {
              const isActive =
                approvalRoute.status === 'PENDING' && idx === approvalRoute.currentStepIdx;
              const config = STEP_STATUS_CONFIG[step.status];
              const isLast = idx === approvalRoute.steps.length - 1;

              return (
                <div key={step.id} className="relative flex gap-4 pb-5">
                  {!isLast && (
                    <div className="absolute bottom-0 left-3 top-7 w-0.5 bg-border" />
                  )}
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
                  <div
                    className={cn(
                      'flex-1 rounded-md px-3 py-2',
                      isActive ? 'border border-blue-200 bg-blue-50' : 'bg-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {ROLE_LABELS[step.role] ?? step.role}
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
