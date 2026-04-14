'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала буровых работ (СП 392, Ф.11.17) */
export function DrillingWorksFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Буровые работы</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Номер скважины *</Label>
          <Input
            value={(data.wellNumber as string) ?? ''}
            onChange={(e) => set('wellNumber', e.target.value)}
            placeholder="БС-01"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Буровой станок</Label>
          <Input
            value={(data.boreMachineType as string) ?? ''}
            onChange={(e) => set('boreMachineType', e.target.value)}
            placeholder="УРБ-2А2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Диаметр (мм) *</Label>
          <Input
            type="number"
            value={(data.diameter as number) ?? ''}
            onChange={(e) => set('diameter', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Глубина (м) *</Label>
          <Input
            type="number"
            value={(data.depth as number) ?? ''}
            onChange={(e) => set('depth', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Выход керна (%)</Label>
          <Input
            type="number"
            value={(data.coreRecovery as number) ?? ''}
            onChange={(e) => set('coreRecovery', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Уровень воды (м)</Label>
          <Input
            type="number"
            value={(data.groundwaterDepth as number) ?? ''}
            onChange={(e) => set('groundwaterDepth', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Способ бурения</Label>
        <Input
          value={(data.drillingMethod as string) ?? ''}
          onChange={(e) => set('drillingMethod', e.target.value)}
          placeholder="Вращательный / Ударно-канатный"
        />
      </div>
    </div>
  );
}
