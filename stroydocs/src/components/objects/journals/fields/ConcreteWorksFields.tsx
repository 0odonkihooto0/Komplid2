'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала бетонных работ (СП 70.13330.2012, Прил. Ф) */
export function ConcreteWorksFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Бетонные работы</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Наименование конструкции *</Label>
          <Input
            value={(data.structureName as string) ?? ''}
            onChange={(e) => set('structureName', e.target.value)}
            placeholder="Фундаментная плита"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Класс бетона *</Label>
          <Input
            value={(data.concreteClass as string) ?? ''}
            onChange={(e) => set('concreteClass', e.target.value)}
            placeholder="B25"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Объём (м³) *</Label>
          <Input
            type="number"
            value={(data.volume as number) ?? ''}
            onChange={(e) => set('volume', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Способ укладки *</Label>
          <Input
            value={(data.placementMethod as string) ?? ''}
            onChange={(e) => set('placementMethod', e.target.value)}
            placeholder="Бетононасос"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Марка бетона</Label>
          <Input
            value={(data.concreteMark as string) ?? ''}
            onChange={(e) => set('concreteMark', e.target.value)}
            placeholder="M350"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Температура смеси (°C)</Label>
          <Input
            type="number"
            value={(data.mixTemperature as number) ?? ''}
            onChange={(e) => set('mixTemperature', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Способ выдерживания</Label>
          <Input
            value={(data.curingMethod as string) ?? ''}
            onChange={(e) => set('curingMethod', e.target.value)}
            placeholder="Термос"
          />
        </div>
        <div className="space-y-1.5">
          <Label>№ протокола испытаний</Label>
          <Input
            value={(data.testProtocolNumber as string) ?? ''}
            onChange={(e) => set('testProtocolNumber', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Поставщик / БСУ</Label>
        <Input
          value={(data.supplierMixPlant as string) ?? ''}
          onChange={(e) => set('supplierMixPlant', e.target.value)}
        />
      </div>
    </div>
  );
}
