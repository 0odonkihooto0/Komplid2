'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProjectCoordinate, CoordinatePayload } from './useCoordinates';

const schema = z.object({
  latitude: z
    .string()
    .min(1, 'Обязательное поле')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= -90 && parseFloat(v) <= 90, {
      message: 'Широта: от −90 до 90',
    }),
  longitude: z
    .string()
    .min(1, 'Обязательное поле')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= -180 && parseFloat(v) <= 180, {
      message: 'Долгота: от −180 до 180',
    }),
  constructionPhase: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: ProjectCoordinate | null;
  isPending: boolean;
  onSubmit: (payload: CoordinatePayload) => void;
}

export function AddCoordinateDialog({ open, onOpenChange, editItem, isPending, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        latitude: editItem ? String(editItem.latitude) : '',
        longitude: editItem ? String(editItem.longitude) : '',
        constructionPhase: editItem?.constructionPhase != null
          ? String(editItem.constructionPhase)
          : '',
      });
    }
  }, [open, editItem, reset]);

  function onValid(values: FormValues) {
    onSubmit({
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
      constructionPhase: values.constructionPhase ? parseInt(values.constructionPhase, 10) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Редактировать точку' : 'Добавить точку'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Широта</Label>
            <Input
              {...register('latitude')}
              placeholder="55.751244"
              inputMode="decimal"
            />
            {errors.latitude && (
              <p className="text-xs text-destructive">{errors.latitude.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Долгота</Label>
            <Input
              {...register('longitude')}
              placeholder="37.618423"
              inputMode="decimal"
            />
            {errors.longitude && (
              <p className="text-xs text-destructive">{errors.longitude.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Очередь строительства (необязательно)</Label>
            <Input
              {...register('constructionPhase')}
              placeholder="1"
              inputMode="numeric"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
