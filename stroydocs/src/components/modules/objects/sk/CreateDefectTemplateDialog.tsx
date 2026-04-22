'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateDefectTemplate, type DefectTemplateItem } from '@/hooks/useDefectTemplates';
import { toast } from '@/hooks/useToast';

const CATEGORY_OPTIONS = [
  { value: 'QUALITY_VIOLATION',    label: 'Нарушение качества' },
  { value: 'TECHNOLOGY_VIOLATION', label: 'Нарушение технологии' },
  { value: 'FIRE_SAFETY',          label: 'Пожарная безопасность' },
  { value: 'ECOLOGY',              label: 'Экология' },
  { value: 'DOCUMENTATION',        label: 'Документация' },
  { value: 'OTHER',                label: 'Прочее' },
] as const;

const schema = z.object({
  title:        z.string().min(1, 'Введите название шаблона').max(200),
  category:     z.enum(['QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY', 'ECOLOGY', 'DOCUMENTATION', 'OTHER']),
  description:  z.string().optional(),
  normativeRef: z.string().optional(),
  requirements: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (template: DefectTemplateItem) => void;
}

export function CreateDefectTemplateDialog({ open, onClose, onCreated }: Props) {
  const createTemplate = useCreateDefectTemplate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'OTHER' },
  });

  const category = watch('category');

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(values: FormValues) {
    createTemplate.mutate(
      {
        title:        values.title,
        category:     values.category,
        description:  values.description || undefined,
        normativeRef: values.normativeRef || undefined,
        requirements: values.requirements || undefined,
      },
      {
        onSuccess: (template: DefectTemplateItem) => {
          toast({ title: 'Шаблон создан', description: values.title });
          reset();
          onCreated(template);
        },
        onError: (err: Error) => {
          toast({ variant: 'destructive', title: 'Ошибка', description: err.message });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый шаблон недостатка</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="tmpl-title">Название *</Label>
            <Input
              id="tmpl-title"
              placeholder="Например: Трещины в несущих конструкциях"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="tmpl-category">Категория *</Label>
            <Select
              value={category}
              onValueChange={(v) => setValue('category', v as FormValues['category'])}
            >
              <SelectTrigger id="tmpl-category">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="tmpl-description">Описание</Label>
            <Textarea
              id="tmpl-description"
              rows={2}
              placeholder="Подробное описание недостатка"
              {...register('description')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tmpl-normative">Нормативная ссылка</Label>
            <Input
              id="tmpl-normative"
              placeholder="СП 70.13330.2022 п.7.1"
              {...register('normativeRef')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tmpl-requirements">Требования</Label>
            <Textarea
              id="tmpl-requirements"
              rows={2}
              placeholder="Обязательные требования по устранению"
              {...register('requirements')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'Создание...' : 'Создать шаблон'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
