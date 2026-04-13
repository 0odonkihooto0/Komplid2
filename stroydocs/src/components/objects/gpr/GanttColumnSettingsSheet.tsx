'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/useToast';

// Все доступные колонки таблиц ГПР
const AVAILABLE_COLUMNS: Array<{ key: string; label: string; alwaysVisible?: boolean }> = [
  { key: 'name',        label: 'Наименование',     alwaysVisible: true },
  { key: 'planStart',   label: 'Начало плана' },
  { key: 'planEnd',     label: 'Конец плана' },
  { key: 'factStart',   label: 'Начало факта' },
  { key: 'factEnd',     label: 'Конец факта' },
  { key: 'progress',    label: 'Прогресс, %' },
  { key: 'amount',      label: 'Стоимость, ₽' },
  { key: 'volume',      label: 'Объём' },
  { key: 'volumeUnit',  label: 'Ед. изм.' },
  { key: 'manHours',    label: 'Чел.часы' },
  { key: 'machineHours', label: 'Маш.часы' },
  { key: 'workType',    label: 'Вид работ' },
  { key: 'isMilestone', label: 'Веха' },
  { key: 'isCritical',  label: 'Критический путь' },
  { key: 'deadline',    label: 'Дедлайн' },
  { key: 'comment',     label: 'Примечание' },
];

// Колонки по умолчанию (если columnSettings не задан)
const DEFAULT_VISIBLE = ['name', 'planStart', 'planEnd', 'progress'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  versionId: string;
  currentSettings: { visibleColumns: string[] } | null;
}

export function GanttColumnSettingsSheet({ open, onOpenChange, objectId, versionId, currentSettings }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const initial = currentSettings?.visibleColumns ?? DEFAULT_VISIBLE;
  const [selected, setSelected] = useState<string[]>(initial);

  // Синхронизируем при открытии
  useEffect(() => {
    if (open) setSelected(currentSettings?.visibleColumns ?? DEFAULT_VISIBLE);
  }, [open, currentSettings]);

  const saveMut = useMutation({
    mutationFn: async (visibleColumns: string[]) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions/${versionId}/column-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleColumns }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка сохранения');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: 'Настройки колонок сохранены' });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 flex flex-col">
        <SheetHeader>
          <SheetTitle>Настройка колонок</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1 py-2">
            {AVAILABLE_COLUMNS.map(({ key, label, alwaysVisible }) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted ${alwaysVisible ? 'opacity-60' : ''}`}
              >
                <Checkbox
                  checked={alwaysVisible || selected.includes(key)}
                  disabled={alwaysVisible}
                  onCheckedChange={() => !alwaysVisible && toggle(key)}
                />
                <span className="text-sm">{label}</span>
                {alwaysVisible && (
                  <span className="ml-auto text-xs text-muted-foreground">всегда</span>
                )}
              </label>
            ))}
          </div>
        </ScrollArea>
        <SheetFooter className="pt-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button
            onClick={() => saveMut.mutate(selected)}
            disabled={saveMut.isPending}
          >
            Применить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
