'use client';

import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PassportProject } from './usePassport';

const STAGES = [
  { key: 'expertise', label: 'Экспертиза' },
  { key: 'survey', label: 'Обследование здания' },
  { key: 'engineering', label: 'Инженерные изыскания' },
  { key: 'design', label: 'Подготовка ПД' },
  { key: 'smr', label: 'СМР' },
  { key: 'commissioning', label: 'Ввод в эксплуатацию' },
] as const;

interface Props {
  project: PassportProject;
}

export function ImplementationTimeline({ project }: Props) {
  const hasSmrDates = project.plannedStartDate && project.plannedEndDate;

  // Расчёт прогресса СМР по срокам
  const smrProgress = (() => {
    if (!project.plannedStartDate || !project.plannedEndDate) return 0;
    const start = new Date(project.plannedStartDate).getTime();
    const end = new Date(project.plannedEndDate).getTime();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)));
  })();

  // СМР завершено если есть фактическая дата окончания
  const smrDone = project.actualEndDate != null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">График реализации</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Полоса стадий */}
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage) => {
            const done = stage.key === 'smr' ? smrDone : false;
            return (
              <Badge
                key={stage.key}
                variant={done ? 'default' : 'secondary'}
                className="flex items-center gap-1 text-xs"
              >
                {done && <Check className="h-3 w-3" />}
                {stage.label}
              </Badge>
            );
          })}
        </div>

        {/* Простой div-Gantt плана СМР */}
        {hasSmrDates ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>План СМР</span>
              <span>{smrProgress}%</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded bg-primary transition-all"
                style={{ width: `${smrProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{new Date(project.plannedStartDate!).toLocaleDateString('ru-RU')}</span>
              <span>{new Date(project.plannedEndDate!).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            График производства работ не задан. Укажите плановые сроки строительства в паспорте
            объекта.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
