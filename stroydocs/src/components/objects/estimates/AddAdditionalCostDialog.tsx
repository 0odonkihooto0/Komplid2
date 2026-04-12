'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type {
  EstimateAdditionalCostType,
  EstimateAdditionalCostApplicationMode,
  EstimateCalculationMethod,
} from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CreateAdditionalCostInput, PatchAdditionalCostInput } from '@/lib/validations/estimate-additional-cost';
import {
  COST_TYPE_LABELS,
  APPLICATION_MODE_LABELS,
  CALCULATION_METHOD_LABELS,
  type AdditionalCostItem,
} from './useAdditionalCosts';

// ─── Тип формы (без Zod-трансформаций) ─────────────────────────────────────

interface CostFormData {
  name: string;
  costType: EstimateAdditionalCostType;
  applicationMode: EstimateAdditionalCostApplicationMode;
  level: number;
  value: string | null;
  constructionWorks: string | null;
  mountingWorks: string | null;
  equipment: string | null;
  other: string | null;
  calculationMethod: EstimateCalculationMethod;
  useCustomPrecision: boolean;
  precision: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCost: AdditionalCostItem | null;
  onSubmitCreate: (data: CreateAdditionalCostInput) => void;
  onSubmitUpdate: (costId: string, data: PatchAdditionalCostInput) => void;
  isPending: boolean;
  objectId: string;
}

/** Диалог создания/редактирования дополнительной затраты */
export function AddAdditionalCostDialog({
  open,
  onOpenChange,
  editingCost,
  onSubmitCreate,
  onSubmitUpdate,
  isPending,
}: Props) {
  const isEdit = !!editingCost;

  const form = useForm<CostFormData>({
    defaultValues: getDefaults(editingCost),
  });

  // Сброс формы при открытии/смене редактируемой затраты
  useEffect(() => {
    if (open) form.reset(getDefaults(editingCost));
  }, [open, editingCost, form]);

  const onSubmit = (data: CostFormData) => {
    // Преобразуем форму в формат API
    const payload: CreateAdditionalCostInput = {
      ...data,
      chapterNames: editingCost?.chapterLinks.map((l) => l.chapterName) ?? [],
      versionIds: editingCost?.estimateLinks.map((l) => l.version.id) ?? [],
    };
    if (isEdit) {
      onSubmitUpdate(editingCost.id, payload);
    } else {
      onSubmitCreate(payload);
    }
  };

  const watchPrecision = form.watch('useCustomPrecision');
  const watchAppMode = form.watch('applicationMode');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактирование затраты' : 'Добавить затраты'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="values">Значения</TabsTrigger>
            </TabsList>

            {/* Вкладка: Основное */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <BasicTabContent form={form} watchPrecision={watchPrecision} watchAppMode={watchAppMode} />
            </TabsContent>

            {/* Вкладка: Значения */}
            <TabsContent value="values" className="space-y-4 mt-4">
              <ValuesTabContent form={form} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Вкладка «Основное» ────────────────────────────────────────────────────

type FormInstance = ReturnType<typeof useForm<CostFormData>>;

function BasicTabContent({
  form,
  watchPrecision,
  watchAppMode,
}: {
  form: FormInstance;
  watchPrecision: boolean;
  watchAppMode: EstimateAdditionalCostApplicationMode;
}) {
  return (
    <>
      <Field label="Наименование" id="name">
        <Input id="name" {...form.register('name', { required: 'Название обязательно' })} />
        <FieldError message={form.formState.errors.name?.message} />
      </Field>

      <Field label="Тип" id="costType">
        <Select
          value={form.watch('costType')}
          onValueChange={(v) => form.setValue('costType', v as EstimateAdditionalCostType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите тип" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Режим применения" id="applicationMode">
        <RadioGroup
          value={watchAppMode}
          onValueChange={(v) => form.setValue('applicationMode', v as EstimateAdditionalCostApplicationMode)}
          className="flex gap-4"
        >
          {Object.entries(APPLICATION_MODE_LABELS).map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`mode-${value}`} />
              <Label htmlFor={`mode-${value}`} className="font-normal cursor-pointer">{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Уровень" id="level">
          <Input id="level" type="number" min={1} {...form.register('level', { valueAsNumber: true })} />
        </Field>
        {watchPrecision && (
          <Field label="Точность (знаков)" id="precision">
            <Input id="precision" type="number" min={0} max={10} {...form.register('precision', { valueAsNumber: true })} />
          </Field>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="useCustomPrecision"
          checked={watchPrecision}
          onCheckedChange={(v) => form.setValue('useCustomPrecision', v === true)}
        />
        <Label htmlFor="useCustomPrecision" className="font-normal cursor-pointer">
          Использовать указанную точность
        </Label>
      </div>
    </>
  );
}

// ─── Вкладка «Значения» ────────────────────────────────────────────────────

function ValuesTabContent({ form }: { form: FormInstance }) {
  return (
    <>
      <Field label="Значение" id="value">
        <Input id="value" {...form.register('value')} />
        <p className="text-xs text-muted-foreground mt-1">
          Идентификаторы: ПЗ, ОЗП, ЭМ, ЗПМ, МАТ, МР, ОБ, НР, СП
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Строительные работы" id="constructionWorks">
          <Input id="constructionWorks" {...form.register('constructionWorks')} />
        </Field>
        <Field label="Монтажные работы" id="mountingWorks">
          <Input id="mountingWorks" {...form.register('mountingWorks')} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Оборудование" id="equipment">
          <Input id="equipment" {...form.register('equipment')} />
        </Field>
        <Field label="Прочее" id="other">
          <Input id="other" {...form.register('other')} />
        </Field>
      </div>

      <Field label="Как считать" id="calculationMethod">
        <Select
          value={form.watch('calculationMethod')}
          onValueChange={(v) => form.setValue('calculationMethod', v as EstimateCalculationMethod)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите метод" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CALCULATION_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

// ─── Хелперы ────────────────────────────────────────────────────────────────

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function getDefaults(cost: AdditionalCostItem | null): CostFormData {
  if (cost) {
    return {
      name: cost.name,
      costType: cost.costType,
      applicationMode: cost.applicationMode,
      level: cost.level,
      value: cost.value,
      constructionWorks: cost.constructionWorks,
      mountingWorks: cost.mountingWorks,
      equipment: cost.equipment,
      other: cost.other,
      calculationMethod: cost.calculationMethod,
      useCustomPrecision: cost.useCustomPrecision,
      precision: cost.precision,
    };
  }
  return {
    name: '',
    costType: 'ACCRUAL_BY_WORK_TYPE',
    applicationMode: 'BY_CHAPTERS',
    level: 1,
    value: null,
    constructionWorks: null,
    mountingWorks: null,
    equipment: null,
    other: null,
    calculationMethod: 'COEFFICIENT',
    useCustomPrecision: false,
    precision: null,
  };
}
