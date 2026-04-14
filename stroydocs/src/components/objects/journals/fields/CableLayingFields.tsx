'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала прокладки кабелей (И 1.13-07, Форма 18) */
export function CableLayingFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Прокладка кабелей</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Марка кабеля *</Label>
          <Input
            value={(data.cableMark as string) ?? ''}
            onChange={(e) => set('cableMark', e.target.value)}
            placeholder="ВВГнг-LS 3×240"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Трасса *</Label>
          <Input
            value={(data.route as string) ?? ''}
            onChange={(e) => set('route', e.target.value)}
            placeholder="КЛ-0,4кВ от ТП-1 до ВРУ"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Длина (м) *</Label>
          <Input
            type="number"
            value={(data.cableLength as number) ?? ''}
            onChange={(e) => set('cableLength', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Кабель №</Label>
          <Input
            value={(data.cableNumber as string) ?? ''}
            onChange={(e) => set('cableNumber', e.target.value)}
            placeholder="А1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Напряжение (кВ)</Label>
          <Input
            value={(data.voltage as string) ?? ''}
            onChange={(e) => set('voltage', e.target.value)}
            placeholder="0.4"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Сечение (мм²)</Label>
          <Input
            value={(data.crossSection as string) ?? ''}
            onChange={(e) => set('crossSection', e.target.value)}
            placeholder="240"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Способ прокладки</Label>
        <Input
          value={(data.layingMethod as string) ?? ''}
          onChange={(e) => set('layingMethod', e.target.value)}
          placeholder="В земле / в трубе"
        />
      </div>
    </div>
  );
}
