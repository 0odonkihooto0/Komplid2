'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONSTRUCTION_TYPE_OPTIONS, RF_SUBJECTS } from '@/utils/constants';
import type { PassportProject, PassportUpdateData } from './usePassport';

const editSchema = z.object({
  name:                z.string().min(2, 'Минимум 2 символа'),
  address:             z.string().optional(),
  generalContractor:   z.string().optional(),
  customer:            z.string().optional(),
  cadastralNumber:     z.string().max(50).optional(),
  area:                z.string().optional(),
  floors:              z.string().optional(),
  responsibilityClass: z.string().optional(),
  permitNumber:        z.string().optional(),
  permitDate:          z.string().optional(),
  permitAuthority:     z.string().optional(),
  designOrg:           z.string().optional(),
  chiefEngineer:       z.string().optional(),
  plannedStartDate:    z.string().optional(),
  plannedEndDate:      z.string().optional(),
  // Расширенные реквизиты
  constructionType:    z.string().optional(),
  region:              z.string().optional(),
  stroyka:             z.string().optional(),
  latitude:            z.string().optional(),
  longitude:           z.string().optional(),
  actualStartDate:     z.string().optional(),
  actualEndDate:       z.string().optional(),
  fillDatesFromGpr:    z.boolean().optional(),
});

type EditForm = z.infer<typeof editSchema>;

// Конвертация "YYYY-MM-DD" → ISO string для API
function toIso(d?: string): string | null {
  if (!d) return null;
  return new Date(d + 'T00:00:00.000Z').toISOString();
}

// Конвертация ISO string → "YYYY-MM-DD" для input[type=date]
function toDateInput(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

interface PassportEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: PassportProject;
  projectId: string;
  onSubmit: (data: PassportUpdateData) => void;
  isPending: boolean;
}

export function PassportEditDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isPending,
}: PassportEditDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  // Заполнить форму актуальными данными при открытии
  useEffect(() => {
    if (open) {
      reset({
        name:                project.name,
        address:             project.address ?? '',
        generalContractor:   project.generalContractor ?? '',
        customer:            project.customer ?? '',
        cadastralNumber:     project.cadastralNumber ?? '',
        area:                project.area != null ? String(project.area) : '',
        floors:              project.floors != null ? String(project.floors) : '',
        responsibilityClass: project.responsibilityClass ?? '',
        permitNumber:        project.permitNumber ?? '',
        permitDate:          toDateInput(project.permitDate),
        permitAuthority:     project.permitAuthority ?? '',
        designOrg:           project.designOrg ?? '',
        chiefEngineer:       project.chiefEngineer ?? '',
        plannedStartDate:    toDateInput(project.plannedStartDate),
        plannedEndDate:      toDateInput(project.plannedEndDate),
        constructionType:    project.constructionType ?? '',
        region:              project.region ?? '',
        stroyka:             project.stroyka ?? '',
        latitude:            project.latitude != null ? String(project.latitude) : '',
        longitude:           project.longitude != null ? String(project.longitude) : '',
        actualStartDate:     toDateInput(project.actualStartDate),
        actualEndDate:       toDateInput(project.actualEndDate),
        fillDatesFromGpr:    project.fillDatesFromGpr ?? false,
      });
    }
  }, [open, project, reset]);

  function handleFormSubmit(data: EditForm) {
    onSubmit({
      name:                data.name,
      address:             data.address || null,
      generalContractor:   data.generalContractor || null,
      customer:            data.customer || null,
      cadastralNumber:     data.cadastralNumber || null,
      area:                data.area ? parseFloat(data.area) : null,
      floors:              data.floors ? parseInt(data.floors, 10) : null,
      responsibilityClass: data.responsibilityClass || null,
      permitNumber:        data.permitNumber || null,
      permitDate:          toIso(data.permitDate),
      permitAuthority:     data.permitAuthority || null,
      designOrg:           data.designOrg || null,
      chiefEngineer:       data.chiefEngineer || null,
      plannedStartDate:    toIso(data.plannedStartDate),
      plannedEndDate:      toIso(data.plannedEndDate),
      constructionType:    data.constructionType || null,
      region:              data.region || null,
      stroyka:             data.stroyka || null,
      latitude:            data.latitude ? parseFloat(data.latitude) : null,
      longitude:           data.longitude ? parseFloat(data.longitude) : null,
      actualStartDate:     toIso(data.actualStartDate),
      actualEndDate:       toIso(data.actualEndDate),
      fillDatesFromGpr:    data.fillDatesFromGpr ?? false,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать паспорт объекта</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Общее */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Общие сведения</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="name">Название объекта *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Адрес</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer">Заказчик</Label>
                <Input id="customer" {...register('customer')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="generalContractor">Генподрядчик</Label>
                <Input id="generalContractor" {...register('generalContractor')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Тип и регион */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Тип и регион</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Тип строительства</Label>
                <Controller
                  control={control}
                  name="constructionType"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSTRUCTION_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label>Регион</Label>
                <Controller
                  control={control}
                  name="region"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите регион" />
                      </SelectTrigger>
                      <SelectContent>
                        {RF_SUBJECTS.map((subj) => (
                          <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="stroyka">Стройка</Label>
                <Input
                  id="stroyka"
                  placeholder="Используется в реквизитах КС-2, КС-3"
                  {...register('stroyka')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Объект */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Характеристики объекта</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cadastralNumber">Кадастровый номер</Label>
                <Input id="cadastralNumber" {...register('cadastralNumber')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="responsibilityClass">Класс ответственности</Label>
                <Input id="responsibilityClass" placeholder="КС-3" {...register('responsibilityClass')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="area">Площадь (м²)</Label>
                <Input id="area" type="number" step="0.01" {...register('area')} />
                {errors.area && <p className="text-xs text-destructive">{errors.area.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="floors">Этажность</Label>
                <Input id="floors" type="number" {...register('floors')} />
                {errors.floors && <p className="text-xs text-destructive">{errors.floors.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="latitude">Широта</Label>
                <Input id="latitude" type="number" step="0.000001" placeholder="55.751244" {...register('latitude')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="longitude">Долгота</Label>
                <Input id="longitude" type="number" step="0.000001" placeholder="37.618423" {...register('longitude')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Разрешение на строительство */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Разрешение на строительство</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="permitNumber">Номер разрешения</Label>
                <Input id="permitNumber" {...register('permitNumber')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="permitDate">Дата выдачи</Label>
                <Input id="permitDate" type="date" {...register('permitDate')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="permitAuthority">Орган выдачи</Label>
                <Input id="permitAuthority" {...register('permitAuthority')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="designOrg">Проектная организация</Label>
                <Input id="designOrg" {...register('designOrg')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="chiefEngineer">ГИП</Label>
                <Input id="chiefEngineer" {...register('chiefEngineer')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Сроки */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Сроки строительства</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="plannedStartDate">Начало (план)</Label>
                <Input id="plannedStartDate" type="date" {...register('plannedStartDate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plannedEndDate">Окончание (план)</Label>
                <Input id="plannedEndDate" type="date" {...register('plannedEndDate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="actualStartDate">Начало (факт)</Label>
                <Input id="actualStartDate" type="date" {...register('actualStartDate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="actualEndDate">Окончание (факт)</Label>
                <Input id="actualEndDate" type="date" {...register('actualEndDate')} />
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <Controller
                  control={control}
                  name="fillDatesFromGpr"
                  render={({ field }) => (
                    <input
                      id="fillDatesFromGpr"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  )}
                />
                <Label htmlFor="fillDatesFromGpr" className="cursor-pointer font-normal">
                  Заполнять даты из актуальной версии ГПР
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
