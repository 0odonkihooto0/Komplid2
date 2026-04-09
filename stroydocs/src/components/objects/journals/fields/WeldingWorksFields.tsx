'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

const JOINT_TYPE_LABELS: Record<string, string> = {
  BUTT: 'Стыковое',
  CORNER: 'Угловое',
  T_JOINT: 'Тавровое',
  LAP: 'Нахлёсточное',
};

/** Поля записи журнала сварочных работ (СП 70.13330.2012, Прил. Б) */
export function WeldingWorksFields({ data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Сварочные работы</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Тип соединения *</Label>
          <Select
            value={(data.jointType as string) ?? ''}
            onValueChange={(v) => set('jointType', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(JOINT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Основной металл *</Label>
          <Input
            value={(data.baseMetal as string) ?? ''}
            onChange={(e) => set('baseMetal', e.target.value)}
            placeholder="Ст3сп"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Толщина (мм) *</Label>
          <Input
            type="number"
            value={(data.thickness as number) ?? ''}
            onChange={(e) => set('thickness', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Марка электрода *</Label>
          <Input
            value={(data.electrodeMark as string) ?? ''}
            onChange={(e) => set('electrodeMark', e.target.value)}
            placeholder="Э50А"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Способ сварки *</Label>
          <Input
            value={(data.weldingMethod as string) ?? ''}
            onChange={(e) => set('weldingMethod', e.target.value)}
            placeholder="РДС"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Клеймо сварщика *</Label>
          <Input
            value={(data.welderStampNumber as string) ?? ''}
            onChange={(e) => set('welderStampNumber', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>ФИО сварщика *</Label>
        <Input
          value={(data.welderFullName as string) ?? ''}
          onChange={(e) => set('welderFullName', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Вид контроля</Label>
          <Input
            value={(data.controlType as string) ?? ''}
            onChange={(e) => set('controlType', e.target.value)}
            placeholder="ВИК"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Результат контроля</Label>
          <Input
            value={(data.controlResult as string) ?? ''}
            onChange={(e) => set('controlResult', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>№ протокола</Label>
          <Input
            value={(data.controlProtocolNumber as string) ?? ''}
            onChange={(e) => set('controlProtocolNumber', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
