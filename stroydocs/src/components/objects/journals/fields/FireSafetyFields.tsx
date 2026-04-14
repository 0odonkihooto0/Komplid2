'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала инструктажа по пожарной безопасности */
export function FireSafetyFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Инструктаж по пожарной безопасности</h4>

      <div className="space-y-1.5">
        <Label>Вид инструктажа *</Label>
        <Input
          value={(data.briefingType as string) ?? ''}
          onChange={(e) => set('briefingType', e.target.value)}
          placeholder="Первичный / Повторный / Внеплановый"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>ФИО инструктируемого *</Label>
          <Input
            value={(data.fullName as string) ?? ''}
            onChange={(e) => set('fullName', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Должность инструктируемого *</Label>
          <Input
            value={(data.position as string) ?? ''}
            onChange={(e) => set('position', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>ФИО инструктора</Label>
          <Input
            value={(data.instructorFullName as string) ?? ''}
            onChange={(e) => set('instructorFullName', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Должность инструктора</Label>
          <Input
            value={(data.instructorPosition as string) ?? ''}
            onChange={(e) => set('instructorPosition', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Дата подписи</Label>
        <Input
          type="date"
          value={(data.signatureDate as string) ?? ''}
          onChange={(e) => set('signatureDate', e.target.value)}
        />
      </div>
    </div>
  );
}
