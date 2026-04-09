'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/utils/format';
import type { WidgetData } from './usePassportWidgets';

interface SmrWidgetProps {
  data: WidgetData;
}

export function SmrWidget({ data }: SmrWidgetProps) {
  const { totalAmount, mastered, completionPercent, planStartDate, planEndDate, delta, isAhead } = data;
  const hasTotal = totalAmount > 0;
  const progressValue = Math.min(100, completionPercent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${isAhead ? 'bg-green-500' : 'bg-red-500'}`}
          />
          СМР
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Суммы */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Общая сумма</span>
          <span className="font-medium text-right">
            {hasTotal ? formatCurrency(totalAmount) : '—'}
          </span>
          <span className="text-muted-foreground">Освоено</span>
          <span className="font-medium text-right">{formatCurrency(mastered)}</span>
        </div>

        {/* Прогресс-бар */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>% выполнения</span>
            <span className="font-semibold text-foreground">{completionPercent}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Даты */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Дата начала</span>
          <span className="font-medium text-right">
            {planStartDate ? formatDate(planStartDate) : '—'}
          </span>
          <span className="text-muted-foreground">Дата окончания</span>
          <span className="font-medium text-right">
            {planEndDate ? formatDate(planEndDate) : '—'}
          </span>
        </div>

        {/* Отклонение от плана */}
        {hasTotal && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Отклонение</span>
            <span className={`font-medium ${isAhead ? 'text-green-600' : 'text-red-600'}`}>
              {isAhead ? '▲' : '▼'}{' '}
              {formatCurrency(Math.abs(delta))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
