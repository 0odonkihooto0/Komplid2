'use client';

import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Введите название версии').max(200),
  versionType: z.enum(['ACTUAL', 'CORRECTIVE']),
  period: z.string().max(50).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<void>;
}

/** Диалог создания пустой версии сметы вручную */
export function CreateVersionDialog({ open, onOpenChange, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { versionType: 'ACTUAL' },
  });

  const versionType = watch('versionType');

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onFormSubmit = async (data: FormValues) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать версию сметы</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Название версии *</Label>
            <Input
              id="name"
              placeholder="Например: Актуальная 2024"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="versionType">Тип версии</Label>
            <Select
              value={versionType}
              onValueChange={(val) => setValue('versionType', val as 'ACTUAL' | 'CORRECTIVE')}
            >
              <SelectTrigger id="versionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTUAL">Актуальная</SelectItem>
                <SelectItem value="CORRECTIVE">Корректировочная</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="period">Период (необязательно)</Label>
            <Input
              id="period"
              placeholder="Например: 2024 Q1"
              {...register('period')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
