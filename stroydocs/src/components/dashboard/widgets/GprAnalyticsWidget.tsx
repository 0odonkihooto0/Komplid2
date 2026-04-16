'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Filter, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGprAnalyticsWidget, fmtAmount } from './useGprAnalyticsWidget';

/** Конфигурация 5 линий ГПР-графика */
const LINES = [
  { dataKey: 'plan',         name: 'План',                   stroke: '#2563EB', dashed: false },
  { dataKey: 'factExec',     name: 'Факт выполнения',        stroke: '#059669', dashed: false },
  { dataKey: 'deviationExec',name: 'Отклонение выполнения',  stroke: '#ef4444', dashed: true  },
  { dataKey: 'factOsv',      name: 'Факт освоения',          stroke: '#7c3aed', dashed: false },
  { dataKey: 'deviationOsv', name: 'Отклонение освоения',    stroke: '#f59e0b', dashed: true  },
] as const;

type LineKey = (typeof LINES)[number]['dataKey'];

interface Props {
  stage: 'PIR' | 'SMR';
  objectIds?: string[];
}

export function GprAnalyticsWidget({ stage, objectIds = [] }: Props) {
  const {
    chartData, isLoading,
    hiddenLines, toggleLine,
    year, setYear,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    period, setPeriod,
    mode, setMode,
  } = useGprAnalyticsWidget({ stage, objectIds });

  const title = stage === 'PIR' ? 'Аналитика ГПР по ПИР' : 'Аналитика ГПР по СМР';

  /** Кастомная легенда: клик скрывает/показывает линию */
  const renderLegend = () => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
      {LINES.map((l) => {
        const hidden = hiddenLines.has(l.dataKey);
        return (
          <button
            key={l.dataKey}
            type="button"
            onClick={() => toggleLine(l.dataKey)}
            className="flex items-center gap-1 text-xs hover:opacity-80"
          >
            <span
              className="inline-block h-0.5 w-5 shrink-0"
              style={{
                backgroundColor: hidden ? '#9ca3af' : l.stroke,
                borderTop: l.dashed ? `2px dashed ${hidden ? '#9ca3af' : l.stroke}` : undefined,
                height: l.dashed ? 0 : 2,
              }}
            />
            <span style={{ color: hidden ? '#9ca3af' : '#374151' }}>{l.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <div className="flex gap-1 shrink-0">
            {/* Попап фильтра */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Фильтры">
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Год</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['2023','2024','2025','2026'].map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Произвольный период (приоритет над годом)</Label>
                    <div className="mt-1 flex gap-2">
                      <Input type="date" className="h-8 text-xs" value={dateFrom ?? ''} onChange={(e) => setDateFrom(e.target.value || undefined)} />
                      <Input type="date" className="h-8 text-xs" value={dateTo ?? ''} onChange={(e) => setDateTo(e.target.value || undefined)} />
                    </div>
                    {(dateFrom || dateTo) && (
                      <button type="button" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="mt-1 text-xs text-muted-foreground hover:text-foreground">
                        Сбросить период
                      </button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Попап настроек */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Настройки">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-4" align="end">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium mb-2">Масштаб</p>
                    <RadioGroup value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                      {[['quarter','За квартал'],['halfyear','За полугодие'],['year','За год']].map(([v,l]) => (
                        <div key={v} className="flex items-center gap-2">
                          <RadioGroupItem value={v} id={`period-${v}`} />
                          <Label htmlFor={`period-${v}`} className="text-xs cursor-pointer">{l}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2">Расчёт</p>
                    <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                      {[['separate','Отдельный'],['cumulative','Накопительный']].map(([v,l]) => (
                        <div key={v} className="flex items-center gap-2">
                          <RadioGroupItem value={v} id={`mode-${v}`} />
                          <Label htmlFor={`mode-${v}`} className="text-xs cursor-pointer">{l}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center text-xs text-muted-foreground">Нет данных ГПР за выбранный период</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={fmtAmount} tick={{ fontSize: 10 }} width={64} />
              <Tooltip formatter={(v) => fmtAmount(v as number)} />
              <Legend content={renderLegend} />
              {LINES.map((l) => (
                <Line
                  key={l.dataKey}
                  type="monotone"
                  dataKey={l.dataKey as LineKey}
                  name={l.name}
                  stroke={l.stroke}
                  strokeDasharray={l.dashed ? '4 2' : undefined}
                  strokeOpacity={hiddenLines.has(l.dataKey) ? 0 : 1}
                  dot={false}
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
