'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePatchInspection, type InspectionDetail } from './useInspections';

const schema = z.object({
  responsibleId:     z.string().min(1, 'Укажите ответственного'),
  contractorPresent: z.enum(['true', 'false'] as const, { error: 'Укажите присутствие подрядчика' }),
});

type FormValues = z.infer<typeof schema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: InspectionDetail;
  objectId: string;
  inspectionId: string;
  onComplete: () => void;
  isLoading: boolean;
}

export function CompleteInspectionDialog({
  open, onOpenChange, inspection, objectId, inspectionId, onComplete, isLoading,
}: Props) {
  const patch = usePatchInspection(objectId, inspectionId);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) return [];
      return json.data as Employee[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      responsibleId: inspection.responsible?.id ?? '',
      contractorPresent: inspection.contractorPresent !== null
        ? String(inspection.contractorPresent) as 'true' | 'false'
        : undefined,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        responsibleId: inspection.responsible?.id ?? '',
        contractorPresent: inspection.contractorPresent !== null
          ? String(inspection.contractorPresent) as 'true' | 'false'
          : undefined,
      });
    }
  }, [open, inspection, reset]);

  const onSubmit = async (values: FormValues) => {
    await patch.mutateAsync({
      responsibleId: values.responsibleId,
      contractorPresent: values.contractorPresent === 'true',
    });
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Завершить проверку</DialogTitle>
          <DialogDescription>
            Проверка №{inspection.number}. Недостатков: {inspection._count.defects}.
            После завершения будут автоматически созданы акт проверки и предписания.
          </DialogDescription>
        </DialogHeader>

        {inspection._count.defects > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              Будет создано предписание на устранение {inspection._count.defects} недостатков.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ответственный *</Label>
            <Select
              defaultValue={inspection.responsible?.id}
              onValueChange={(v) => setValue('responsibleId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите ответственного" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}{e.position ? ` — ${e.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.responsibleId && (
              <p className="text-xs text-destructive">{errors.responsibleId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Присутствие подрядчика *</Label>
            <div className="flex gap-4">
              {([['true', 'Присутствовал'], ['false', 'Не присутствовал']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contractorPresent"
                    value={val}
                    defaultChecked={
                      inspection.contractorPresent !== null &&
                      String(inspection.contractorPresent) === val
                    }
                    onChange={() => setValue('contractorPresent', val)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            {errors.contractorPresent && (
              <p className="text-xs text-destructive">{errors.contractorPresent.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading || patch.isPending}>
              {isLoading || patch.isPending ? 'Завершение...' : 'Завершить проверку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
