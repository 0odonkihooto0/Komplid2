'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { ChartType } from './useSkAnalytics';

const DEFAULT_COLORS = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

interface ChartItem {
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
}

export function SkChartWidget({ title, data, chartType, onTypeChange, colors = DEFAULT_COLORS }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <div className="flex gap-1">
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Нет данных</p>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={180}>
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
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={false}>
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
