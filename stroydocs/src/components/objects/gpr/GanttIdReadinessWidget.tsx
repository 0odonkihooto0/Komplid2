'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IdReadinessItem } from './useGanttAnalytics';

interface Props {
  idReadiness: IdReadinessItem[];
}

type BadgeVariant = 'destructive' | 'secondary' | 'default';

function readinessPct(item: IdReadinessItem): number {
  return item.linkedDocsCount === 0
    ? 0
    : Math.round((item.signedDocsCount / item.linkedDocsCount) * 100);
}

function readinessBadgeVariant(pct: number): BadgeVariant {
  if (pct < 30) return 'destructive';
  if (pct < 70) return 'secondary';
  return 'default';
}

export function GanttIdReadinessWidget({ idReadiness }: Props) {
  const rows = useMemo(
    () =>
      idReadiness.map((item) => {
        const pct = readinessPct(item);
        return { ...item, pct, variant: readinessBadgeVariant(pct) };
      }),
    [idReadiness],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Готовность ИД по позициям</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="overflow-auto max-h-56">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 text-left font-medium">Работа</th>
                  <th className="py-1 text-right font-medium">% ИД</th>
                  <th className="py-1 text-right font-medium">Привязано</th>
                  <th className="py-1 text-right font-medium">Подписано</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.taskId} className="border-b last:border-0">
                    <td className="py-1 pr-2 max-w-[160px] truncate">{row.taskName}</td>
                    <td className="py-1 text-right">
                      <Badge variant={row.variant}>{row.pct}%</Badge>
                    </td>
                    <td className="py-1 text-right">{row.linkedDocsCount}</td>
                    <td className="py-1 text-right">{row.signedDocsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-12 text-center text-xs text-muted-foreground">
            Нет задач с привязанной ИД.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
