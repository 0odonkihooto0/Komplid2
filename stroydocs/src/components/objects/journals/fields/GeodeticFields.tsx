'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала геодезических работ (Форма Ф-5) */
export function GeodeticFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Геодезические работы</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Пикет</Label>
          <Input
            value={(data.picket as string) ?? ''}
            onChange={(e) => set('picket', e.target.value)}
            placeholder="ПК0+00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Отметка проектная (м)</Label>
          <Input
            type="number"
            value={(data.designElevation as number) ?? ''}
            onChange={(e) => set('designElevation', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Отметка фактическая (м)</Label>
          <Input
            type="number"
            value={(data.actualElevation as number) ?? ''}
            onChange={(e) => set('actualElevation', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Отклонение (мм)</Label>
          <Input
            type="number"
            value={(data.deviation as number) ?? ''}
            onChange={(e) => set('deviation', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Прибор *</Label>
          <Input
            value={(data.instrument as string) ?? ''}
            onChange={(e) => set('instrument', e.target.value)}
            placeholder="Нивелир Leica NA720"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Заводской номер прибора</Label>
          <Input
            value={(data.instrumentNumber as string) ?? ''}
            onChange={(e) => set('instrumentNumber', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Замер выполнил</Label>
        <Input
          value={(data.measuredBy as string) ?? ''}
          onChange={(e) => set('measuredBy', e.target.value)}
        />
      </div>
    </div>
  );
}
