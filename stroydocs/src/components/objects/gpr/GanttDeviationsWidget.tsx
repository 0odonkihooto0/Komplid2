'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviationItem } from './useGanttAnalytics';

interface Props {
  deviations: DeviationItem[];
}

export function GanttDeviationsWidget({ deviations }: Props) {
  // Топ-10 задач с наибольшим отставанием (только положительные deltaStart)
  const top = useMemo(() => {
    return deviations
      .filter((d) => d.deltaStart !== null && d.deltaStart > 0)
      .sort((a, b) => (b.deltaStart ?? 0) - (a.deltaStart ?? 0))
      .slice(0, 10)
      .map((d) => ({
        name: d.taskName.length > 28 ? `${d.taskName.slice(0, 27)}…` : d.taskName,
        дни: d.deltaStart ?? 0,
      }));
  }, [deviations]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Топ-10 задержек</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit=" дн." />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${v} дн.`} />
              <Bar dataKey="дни" radius={[0, 3, 3, 0]}>
                {top.map((_, idx) => (
                  <Cell key={idx} fill="#ef4444" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-xs text-muted-foreground">
            Задержек нет — все задачи в срок.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
