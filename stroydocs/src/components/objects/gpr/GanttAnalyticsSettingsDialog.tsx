'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface AnalyticsSettings {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  unit: 'rub' | 'percent';
  lines: { pv: boolean; ev: boolean; ac: boolean; planPct: boolean; factPct: boolean };
}

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  period: 'week',
  unit: 'rub',
  lines: { pv: true, ev: true, ac: true, planPct: true, factPct: true },
};

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Дни' },
  { value: 'week', label: 'Недели' },
  { value: 'month', label: 'Месяцы' },
  { value: 'quarter', label: 'Кварталы' },
  { value: 'year', label: 'Годы' },
] as const;

const UNIT_OPTIONS = [
  { value: 'rub', label: 'Рубли' },
  { value: 'percent', label: 'Проценты (%)' },
] as const;

const LINE_OPTIONS = [
  { key: 'pv' as const, label: 'PV — Плановый объём' },
  { key: 'ev' as const, label: 'EV — Освоенный объём' },
  { key: 'ac' as const, label: 'AC — Фактические затраты' },
  { key: 'planPct' as const, label: 'План (%)' },
  { key: 'factPct' as const, label: 'Факт (%)' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AnalyticsSettings;
  onApply: (s: AnalyticsSettings) => void;
}

export function GanttAnalyticsSettingsDialog({ open, onOpenChange, settings, onApply }: Props) {
  const [draft, setDraft] = useState<AnalyticsSettings>(settings);

  function handleLineToggle(key: keyof AnalyticsSettings['lines']) {
    setDraft((prev) => ({
      ...prev,
      lines: { ...prev.lines, [key]: !prev.lines[key] },
    }));
  }

  function handleApply() {
    onApply(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Настройки аналитики</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Период детализации */}
          <div className="space-y-1.5">
            <Label className="text-xs">Период детализации</Label>
            <Select
              value={draft.period}
              onValueChange={(v) => setDraft((p) => ({ ...p, period: v as AnalyticsSettings['period'] }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Единицы */}
          <div className="space-y-1.5">
            <Label className="text-xs">Единицы измерения</Label>
            <Select
              value={draft.unit}
              onValueChange={(v) => setDraft((p) => ({ ...p, unit: v as AnalyticsSettings['unit'] }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Линии S-кривой */}
          <div className="space-y-2">
            <Label className="text-xs">Линии S-кривой</Label>
            {LINE_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <Checkbox
                  id={`line-${opt.key}`}
                  checked={draft.lines[opt.key]}
                  onCheckedChange={() => handleLineToggle(opt.key)}
                />
                <Label htmlFor={`line-${opt.key}`} className="text-xs font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button size="sm" onClick={handleApply}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
