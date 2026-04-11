'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useActivityCategories, useCreateActivityDocument } from './useActivities';

const schema = z.object({
  categoryId: z.string().min(1, 'Выберите категорию'),
  name:       z.string().min(1, 'Введите наименование'),
  type:       z.string().optional(),
  number:     z.string().optional(),
  date:       z.string().optional(),
  status:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = ['В работе', 'Согласовано', 'Отклонено', 'На проверке', 'Подписано'];

interface CreateActivityDocumentDialogProps {
  open:                    boolean;
  onOpenChange:            (open: boolean) => void;
  objectId:                string;
  preselectedCategoryId?:  string;
}

export function CreateActivityDocumentDialog({
  open,
  onOpenChange,
  objectId,
  preselectedCategoryId,
}: CreateActivityDocumentDialogProps) {
  const { data: categories = [] } = useActivityCategories(objectId);
  const createMutation = useCreateActivityDocument(objectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: preselectedCategoryId ?? '',
      name:       '',
      type:       '',
      number:     '',
      date:       '',
      status:     'В работе',
    },
  });

  // Сброс формы при открытии с новым preselectedCategoryId
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        categoryId: preselectedCategoryId ?? '',
        name:       '',
        type:       '',
        number:     '',
        date:       '',
        status:     'В работе',
      });
    }
    onOpenChange(nextOpen);
  }

  function onSubmit(values: FormValues) {
    createMutation.mutate(
      {
        categoryId: values.categoryId,
        name:       values.name,
        type:       values.type || undefined,
        number:     values.number || undefined,
        date:       values.date || undefined,
        status:     values.status,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  }

  const selectedCategoryName = preselectedCategoryId
    ? categories.find((c) => c.id === preselectedCategoryId)?.name
    : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать документ мероприятия</DialogTitle>
          <DialogDescription className="sr-only">
            Заполните поля для создания нового документа в реестре мероприятий
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Категория */}
          <div className="space-y-1.5">
            <Label>Категория *</Label>
            {preselectedCategoryId ? (
              <Input value={selectedCategoryName ?? preselectedCategoryId} disabled />
            ) : (
              <Select
                value={form.watch('categoryId')}
                onValueChange={(v) => form.setValue('categoryId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.categoryId && (
              <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          {/* Наименование */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Наименование *</Label>
            <Input id="name" {...form.register('name')} placeholder="Введите наименование" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Тип и Номер */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Тип документа</Label>
              <Input id="type" {...form.register('type')} placeholder="Например: Приказ" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="number">Номер</Label>
              <Input id="number" {...form.register('number')} placeholder="№" />
            </div>
          </div>

          {/* Дата и Статус */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Дата</Label>
              <Input id="date" type="date" {...form.register('date')} />
            </div>
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
