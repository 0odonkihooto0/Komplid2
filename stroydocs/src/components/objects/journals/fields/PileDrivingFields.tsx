'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала погружения свай (СП 392.1325800.2018, Форма 4.1) */
export function PileDrivingFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Погружение свай</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Номер сваи *</Label>
          <Input
            value={(data.pileNumber as string) ?? ''}
            onChange={(e) => set('pileNumber', e.target.value)}
            placeholder="С-001"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Тип молота *</Label>
          <Input
            value={(data.hammerType as string) ?? ''}
            onChange={(e) => set('hammerType', e.target.value)}
            placeholder="Гидромолот JCB HM580"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Длина сваи (м) *</Label>
          <Input
            type="number"
            value={(data.pileLength as number) ?? ''}
            onChange={(e) => set('pileLength', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Отказ (мм)</Label>
          <Input
            type="number"
            value={(data.refusal as number) ?? ''}
            onChange={(e) => set('refusal', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Тип сваи</Label>
          <Input
            value={(data.pileType as string) ?? ''}
            onChange={(e) => set('pileType', e.target.value)}
            placeholder="Ж/б забивная 300×300"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Глубина погружения (м)</Label>
          <Input
            type="number"
            value={(data.penetrationDepth as number) ?? ''}
            onChange={(e) => set('penetrationDepth', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Отметка головы сваи (м)</Label>
        <Input
          type="number"
          value={(data.beamElevation as number) ?? ''}
          onChange={(e) => set('beamElevation', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="0"
        />
      </div>
    </div>
  );
}
