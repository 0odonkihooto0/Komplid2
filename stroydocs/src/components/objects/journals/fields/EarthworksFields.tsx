'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала земляных работ (СП 392.1325800.2018, Форма 5.1) */
export function EarthworksFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Земляные работы</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Тип грунта *</Label>
          <Input
            value={(data.soilType as string) ?? ''}
            onChange={(e) => set('soilType', e.target.value)}
            placeholder="Суглинок тугопластичный"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Объём (м³) *</Label>
          <Input
            type="number"
            value={(data.volume as number) ?? ''}
            onChange={(e) => set('volume', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Механизм *</Label>
          <Input
            value={(data.mechanism as string) ?? ''}
            onChange={(e) => set('mechanism', e.target.value)}
            placeholder="Экскаватор Komatsu PC200"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Глубина (м)</Label>
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
          <Label>Ширина выемки (м)</Label>
          <Input
            type="number"
            value={(data.excavationWidth as number) ?? ''}
            onChange={(e) => set('excavationWidth', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Категория грунта</Label>
          <Input
            value={(data.soilCategory as string) ?? ''}
            onChange={(e) => set('soilCategory', e.target.value)}
            placeholder="II"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Водоотлив</Label>
        <Input
          value={(data.dewatering as string) ?? ''}
          onChange={(e) => set('dewatering', e.target.value)}
          placeholder="Насос Wacker"
        />
      </div>
    </div>
  );
}
