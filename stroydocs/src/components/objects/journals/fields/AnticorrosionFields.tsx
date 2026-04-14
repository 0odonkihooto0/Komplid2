'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала антикоррозионной защиты (СП 72.13330.2016, Прил. Г) */
export function AnticorrosionFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Антикоррозионная защита</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Марка материала *</Label>
          <Input
            value={(data.materialMark as string) ?? ''}
            onChange={(e) => set('materialMark', e.target.value)}
            placeholder="ГФ-021"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Расход (кг/м²)</Label>
          <Input
            type="number"
            value={(data.consumption as number) ?? ''}
            onChange={(e) => set('consumption', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Количество слоёв *</Label>
          <Input
            type="number"
            value={(data.layers as number) ?? ''}
            onChange={(e) => set('layers', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Метод нанесения *</Label>
          <Input
            value={(data.method as string) ?? ''}
            onChange={(e) => set('method', e.target.value)}
            placeholder="Кисть / пневмораспылитель"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Подготовка поверхности</Label>
          <Input
            value={(data.surfacePrep as string) ?? ''}
            onChange={(e) => set('surfacePrep', e.target.value)}
            placeholder="Дробеструйная Са2"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Толщина сухой плёнки (мкм)</Label>
          <Input
            type="number"
            value={(data.dryFilmThickness as number) ?? ''}
            onChange={(e) => set('dryFilmThickness', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Температура воздуха (°C)</Label>
        <Input
          type="number"
          value={(data.ambientTemperature as number) ?? ''}
          onChange={(e) => set('ambientTemperature', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>
    </div>
  );
}
