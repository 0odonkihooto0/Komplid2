'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/** Поля записи журнала авторского надзора (СП 246.1325800.2023, Прил. Б) */
export function SupervisionFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Авторский надзор</h4>

      <div className="space-y-1.5">
        <Label>Представитель проектной организации *</Label>
        <Input
          value={(data.designOrgRepresentative as string) ?? ''}
          onChange={(e) => set('designOrgRepresentative', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Выявленные отступления</Label>
        <Textarea
          value={(data.deviationsFound as string) ?? ''}
          onChange={(e) => set('deviationsFound', e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Указания по устранению</Label>
        <Textarea
          value={(data.instructions as string) ?? ''}
          onChange={(e) => set('instructions', e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Срок выполнения указаний</Label>
          <Input
            type="date"
            value={(data.instructionDeadline as string) ?? ''}
            onChange={(e) => set('instructionDeadline', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Отметка о выполнении</Label>
          <Input
            value={(data.implementationNote as string) ?? ''}
            onChange={(e) => set('implementationNote', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
