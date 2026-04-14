'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала монтажа конструкций (СП 70.13330.2012, Прил. А) */
export function MountingWorksFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Монтаж конструкций</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Наименование конструкции *</Label>
          <Input
            value={(data.structureName as string) ?? ''}
            onChange={(e) => set('structureName', e.target.value)}
            placeholder="Ферма перекрытия"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Марка конструкции *</Label>
          <Input
            value={(data.structureMark as string) ?? ''}
            onChange={(e) => set('structureMark', e.target.value)}
            placeholder="Ф-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Масса (т)</Label>
          <Input
            type="number"
            value={(data.mass as number) ?? ''}
            onChange={(e) => set('mass', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Способ монтажа *</Label>
          <Input
            value={(data.mountingMethod as string) ?? ''}
            onChange={(e) => set('mountingMethod', e.target.value)}
            placeholder="Кран КС-55713"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Монтажная погрешность (мм)</Label>
          <Input
            value={(data.installationTolerance as string) ?? ''}
            onChange={(e) => set('installationTolerance', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Способ выверки</Label>
          <Input
            value={(data.alignmentMethod as string) ?? ''}
            onChange={(e) => set('alignmentMethod', e.target.value)}
            placeholder="Теодолит"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Тип крепления</Label>
        <Input
          value={(data.fastenerType as string) ?? ''}
          onChange={(e) => set('fastenerType', e.target.value)}
          placeholder="Болты М20"
        />
      </div>
    </div>
  );
}
