'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SCurvePoint } from './useGanttAnalytics';

interface Props {
  sCurve: SCurvePoint[];
  cumulative: boolean;
  onCumulativeChange: (v: boolean) => void;
}

// Преобразование накопительного в приростной вид
function toPeriodicDelta(points: SCurvePoint[]): SCurvePoint[] {
  return points.map((p, i) => ({
    date: p.date,
    plannedProgress: i === 0 ? p.plannedProgress : Math.max(0, p.plannedProgress - points[i - 1].plannedProgress),
    actualProgress: i === 0 ? p.actualProgress : Math.max(0, p.actualProgress - points[i - 1].actualProgress),
  }));
}

export function GanttSCurveWidget({ sCurve, cumulative, onCumulativeChange }: Props) {
  // Данные для графика: добавляем поле gap для зоны отставания
  const chartData = useMemo(() => {
    const pts = cumulative ? sCurve : toPeriodicDelta(sCurve);
    return pts.map((p) => ({
      ...p,
      gap: Math.max(0, p.plannedProgress - p.actualProgress),
    }));
  }, [sCurve, cumulative]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">S-кривая план / факт</CardTitle>
          <div className="flex items-center gap-2">
            <Switch id="sc-cumulative" checked={cumulative} onCheckedChange={onCumulativeChange} />
            <Label htmlFor="sc-cumulative" className="text-xs">Накопительный</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              {/* Зона отставания (красная) */}
              <Area dataKey="gap" name="Отставание" fill="#ef4444" fillOpacity={0.15} stroke="none" />
              <Line type="monotone" dataKey="plannedProgress" name="План" stroke="#2563EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actualProgress" name="Факт" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-xs text-muted-foreground">
            Нет данных. Убедитесь что у версии заданы даты начала и конца.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
