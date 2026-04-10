'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { createLandPlotSchema, type CreateLandPlotInput } from '@/lib/validations/land-plot';
import { useLandPlots, type LandPlot } from './useLandPlots';
import { OrgSearchInput } from './OrgSearchInput';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  /** Если передан — режим редактирования */
  initialValues?: LandPlot;
}

export function AddLandPlotDialog({ open, onOpenChange, projectId, initialValues }: Props) {
  const { createMutation, updateMutation } = useLandPlots(projectId);
  const isEdit = !!initialValues;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLandPlotInput>({
    resolver: zodResolver(createLandPlotSchema),
    defaultValues: initialValues ? {
      cadastralNumber: initialValues.cadastralNumber,
      address: initialValues.address ?? '',
      area: initialValues.area ?? undefined,
      landCategory: initialValues.landCategory ?? '',
      permittedUse: initialValues.permittedUse ?? '',
      cadastralValue: initialValues.cadastralValue ?? undefined,
      status: initialValues.status ?? '',
      ownershipForm: initialValues.ownershipForm ?? '',
      hasEncumbrances: initialValues.hasEncumbrances,
      encumbranceInfo: initialValues.encumbranceInfo ?? '',
      hasRestrictions: initialValues.hasRestrictions,
      restrictionInfo: initialValues.restrictionInfo ?? '',
      hasDemolitionObjects: initialValues.hasDemolitionObjects,
      demolitionInfo: initialValues.demolitionInfo ?? '',
      inspectionDate: initialValues.inspectionDate ?? '',
      egrnNumber: initialValues.egrnNumber ?? '',
      gpzuNumber: initialValues.gpzuNumber ?? '',
      gpzuDate: initialValues.gpzuDate ?? '',
      ownerOrgId: initialValues.ownerOrgId ?? undefined,
      tenantOrgId: initialValues.tenantOrgId ?? undefined,
    } : { hasEncumbrances: false, hasRestrictions: false, hasDemolitionObjects: false },
  });

  const hasEncumbrances = watch('hasEncumbrances');
  const hasRestrictions = watch('hasRestrictions');
  const hasDemolitionObjects = watch('hasDemolitionObjects');

  const onSubmit = (values: CreateLandPlotInput) => {
    const mutation = isEdit
      ? updateMutation.mutateAsync({ id: initialValues!.id, data: values })
      : createMutation.mutateAsync(values);

    mutation.then(() => {
      reset();
      onOpenChange(false);
    }).catch(() => {/* ошибки обрабатываются в хуке */});
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать участок' : 'Добавить земельный участок'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="cadastralNumber">Кадастровый номер *</Label>
            <Input id="cadastralNumber" {...register('cadastralNumber')} className="mt-1" />
            {errors.cadastralNumber && <p className="text-sm text-destructive mt-1">{errors.cadastralNumber.message}</p>}
          </div>

          <div>
            <Label htmlFor="address">Адрес</Label>
            <Input id="address" {...register('address')} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <OrgSearchInput
              label="Правообладатель"
              initialName={initialValues?.ownerOrg?.name}
              onSelect={(id) => setValue('ownerOrgId', id)}
            />
            <OrgSearchInput
              label="Арендатор"
              initialName={initialValues?.tenantOrg?.name}
              onSelect={(id) => setValue('tenantOrgId', id)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Статус</Label>
              <Input id="status" {...register('status')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ownershipForm">Форма собственности</Label>
              <Input id="ownershipForm" {...register('ownershipForm')} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="area">Площадь, кв.м.</Label>
              <Input id="area" type="number" step="0.01" {...register('area', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cadastralValue">Кадастровая стоимость, руб.</Label>
              <Input id="cadastralValue" type="number" step="0.01" {...register('cadastralValue', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="landCategory">Категория земель</Label>
              <Input id="landCategory" {...register('landCategory')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="permittedUse">Вид разрешённого использования</Label>
              <Input id="permittedUse" {...register('permittedUse')} className="mt-1" />
            </div>
          </div>

          {/* Обременения */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="hasEncumbrances" checked={hasEncumbrances} onCheckedChange={(v) => setValue('hasEncumbrances', !!v)} />
              <Label htmlFor="hasEncumbrances">Обременения</Label>
            </div>
            {hasEncumbrances && <Textarea placeholder="Описание обременений..." {...register('encumbranceInfo')} rows={2} />}
          </div>

          {/* Ограничения */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="hasRestrictions" checked={hasRestrictions} onCheckedChange={(v) => setValue('hasRestrictions', !!v)} />
              <Label htmlFor="hasRestrictions">Ограничения</Label>
            </div>
            {hasRestrictions && <Textarea placeholder="Описание ограничений..." {...register('restrictionInfo')} rows={2} />}
          </div>

          {/* Объекты под снос */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="hasDemolitionObjects" checked={hasDemolitionObjects} onCheckedChange={(v) => setValue('hasDemolitionObjects', !!v)} />
              <Label htmlFor="hasDemolitionObjects">Объекты под снос</Label>
            </div>
            {hasDemolitionObjects && <Textarea placeholder="Описание объектов под снос..." {...register('demolitionInfo')} rows={2} />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inspectionDate">Дата осмотра</Label>
              <Input id="inspectionDate" type="date" {...register('inspectionDate')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="egrnNumber">Номер ЕГРН</Label>
              <Input id="egrnNumber" {...register('egrnNumber')} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gpzuNumber">ГПЗУ номер</Label>
              <Input id="gpzuNumber" {...register('gpzuNumber')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="gpzuDate">ГПЗУ дата</Label>
              <Input id="gpzuDate" type="date" {...register('gpzuDate')} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
