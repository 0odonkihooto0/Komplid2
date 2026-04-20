'use client';

import { cn } from '@/lib/utils';
import type { RouteStep } from '@/app/api/notifications/inbox/route';

interface Props {
  steps: RouteStep[];
}

export function ApprovalRouteSteps({ steps }: Props) {
  if (steps.length === 0) {
    return <p className="text-xs text-muted-foreground">Маршрут не задан</p>;
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={i} className="relative grid grid-cols-[14px_1fr] gap-x-2.5 py-2">
          {/* Vertical connector line */}
          {i < steps.length - 1 && (
            <span className="absolute left-[6px] top-[18px] bottom-[-8px] w-px bg-border" />
          )}

          {/* Step dot */}
          <div className={cn(
            'relative z-10 mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2',
            step.state === 'done' && 'border-emerald-500 bg-emerald-500',
            step.state === 'cur' && 'border-primary bg-primary shadow-[0_0_0_3px] shadow-primary/20',
            step.state === 'wait' && 'border-border bg-background'
          )} />

          {/* Step content */}
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{step.label}</p>
            <p className={cn(
              'text-[11px]',
              step.state === 'cur' ? 'text-primary' : 'text-muted-foreground'
            )}>
              {step.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
