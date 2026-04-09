'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDefectAndLink } from './useModelViewer';

const CATEGORIES = [
  { value: 'QUALITY_VIOLATION',    label: 'Нарушение качества' },
  { value: 'TECHNOLOGY_VIOLATION', label: 'Нарушение технологии' },
  { value: 'FIRE_SAFETY',          label: 'Пожарная безопасность' },
  { value: 'DOCUMENTATION',        label: 'Документация' },
  { value: 'OTHER',                label: 'Прочее' },
] as const;

const schema = z.object({
  title:        z.string().min(1, 'Введите название замечания'),
  description:  z.string().optional(),
  category:     z.string().default('OTHER'),
  normativeRef: z.string().optional(),
  deadline:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  elementId: string;
  modelId: string;
  projectId: string;
}

export function DefectCreateDialog({ open, onOpenChange, elementId, modelId, projectId }: Props) {
  const createAndLink = useCreateDefectAndLink(projectId);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'OTHER' },
  });

  function onSubmit(data: FormValues) {
    createAndLink.mutate(
      { elementId, modelId, ...data },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Создать замечание к элементу</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Название */}
          <div className="space-y-1">
            <Label className="text-xs">Название *</Label>
            <Input {...register('title')} className="h-8 text-sm" placeholder="Укажите суть замечания" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-1">
            <Label className="text-xs">Описание</Label>
            <Textarea
              {...register('description')}
              className="min-h-[60px] text-sm"
              placeholder="Подробное описание замечания..."
            />
          </div>

          {/* Категория */}
          <div className="space-y-1">
            <Label className="text-xs">Категория</Label>
            <Select defaultValue="OTHER" onValueChange={v => setValue('category', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-sm">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Нормативная ссылка */}
          <div className="space-y-1">
            <Label className="text-xs">Нормативная ссылка</Label>
            <Input
              {...register('normativeRef')}
              className="h-8 text-sm"
              placeholder="СП 70.13330.2022 п. 4.1..."
            />
          </div>

          {/* Срок устранения */}
          <div className="space-y-1">
            <Label className="text-xs">Срок устранения</Label>
            <Input
              {...register('deadline')}
              type="date"
              className="h-8 text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
              Отмена
            </Button>
            <Button type="submit" size="sm" disabled={createAndLink.isPending}>
              {createAndLink.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Создать и привязать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
