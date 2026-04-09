'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SCurvePoint } from './useGanttAnalytics';

interface Props {
  sCurve: SCurvePoint[];
}

function progressBarColor(fact: number, plan: number): string {
  if (fact < plan - 5) return 'bg-red-500';
  if (fact > plan + 5) return 'bg-yellow-400';
  return 'bg-green-500';
}

function statusLabel(fact: number, plan: number): string {
  if (fact < plan - 5) return '⚠ Отставание от графика';
  if (fact > plan + 5) return '↑ Опережение графика';
  return '✓ В рамках плана';
}

export function GanttCurrentProgressWidget({ sCurve }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  // Последняя точка S-кривой до сегодняшней даты
  const point = useMemo(() => {
    const past = sCurve.filter((p) => p.date <= today);
    return past.length > 0 ? past[past.length - 1] : null;
  }, [sCurve, today]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Текущее выполнение СМР</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {point ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Факт:{' '}
                <span className="font-semibold text-foreground">{point.actualProgress}%</span>
                {' '}от плана{' '}
                <span className="font-semibold text-foreground">{point.plannedProgress}%</span>
              </p>
              <div className="relative h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressBarColor(point.actualProgress, point.plannedProgress)}`}
                  style={{ width: `${Math.min(point.actualProgress, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {statusLabel(point.actualProgress, point.plannedProgress)}
            </p>
            <p className="text-xs text-muted-foreground">На дату: {point.date}</p>
          </>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Нет данных за текущую дату. Задайте диапазон версии.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
