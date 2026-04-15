'use client';

import { Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { ChartType } from './useSkAnalytics';

const DEFAULT_COLORS = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

export interface ChartItem {
  name: string;
  count: number;
  color?: string;
}

interface Props {
  title: string;
  data: ChartItem[];
  chartType: ChartType;
  onTypeChange: (t: ChartType) => void;
  colors?: string[];
  /** Высота области графика в пикселях (по умолчанию 180) */
  height?: number;
  /** Показывать числовые метки на сегментах круговой диаграммы (кол-во + %) */
  showLabels?: boolean;
  /** Колбэк для кнопки «Развернуть» */
  onExpand?: () => void;
}

export function SkChartWidget({
  title,
  data,
  chartType,
  onTypeChange,
  colors = DEFAULT_COLORS,
  height = 180,
  showLabels = false,
  onExpand,
}: Props) {
  const outerRadius = Math.floor(height / 3);

  const pieLabel = showLabels
    ? ({ value, percent }: { value?: number; percent?: number }) =>
        `${value ?? 0} (${Math.round((percent ?? 0) * 100)}%)`
    : false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'outline'}
              className="h-6 px-2 text-xs"
              onClick={() => onTypeChange('bar')}
            >
              Столбик
            </Button>
            <Button
              size="sm"
              variant={chartType === 'pie' ? 'default' : 'outline'}
              className="h-6 px-2 text-xs"
              onClick={() => onTypeChange('pie')}
            >
              Круговая
            </Button>
            {onExpand && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 ml-1"
                title="Развернуть"
                onClick={onExpand}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Нет данных</p>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Кол-во" radius={[3, 3, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.color ?? colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={outerRadius}
                label={pieLabel}
                labelLine={showLabels}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.color ?? colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
