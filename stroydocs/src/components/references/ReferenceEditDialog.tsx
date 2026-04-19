'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/useToast';
import type { ReferenceSchema, ReferenceFieldSchema } from '@/lib/references/types';

interface Props {
  schema: ReferenceSchema;
  entry?: Record<string, unknown>;
  /** Начальные значения скрытых полей при создании дочерней записи (parentId, level) */
  defaultValues?: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  queryKey: unknown[];
}

function buildShape(fields: ReferenceFieldSchema[], patch: boolean): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.readonly || f.hidden) continue;
    let s: z.ZodTypeAny;
    switch (f.type) {
      case 'number': s = z.coerce.number(); break;
      case 'boolean': s = z.boolean().default(false); break;
      case 'date': s = z.string(); break;
      default: s = z.string();
    }
    const optional = patch || !f.required;
    shape[f.key] = optional ? s.optional().nullable() as z.ZodTypeAny : s;
  }
  return shape;
}

export function ReferenceEditDialog({ schema, entry, defaultValues, open, onOpenChange, onSuccess, queryKey }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!entry;

  const zodSchema = useMemo(
    () => z.object(buildShape(schema.fields, isEdit)),
    [schema.fields, isEdit]
  );

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(zodSchema) });

  useEffect(() => {
    if (open) reset(entry ?? {});
  }, [open, entry, reset]);
  // defaultValues не включаем в reset — они передаются напрямую в body при create

  async function onSubmit(values: Record<string, unknown>) {
    const url = isEdit
      ? `/api/references/${schema.slug}/${entry!.id as string}`
      : `/api/references/${schema.slug}`;
    // При создании дочерней записи добавляем скрытые поля (parentId, level)
    const body = isEdit ? values : { ...(defaultValues ?? {}), ...values };
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      toast({ title: 'Ошибка', description: json.error as string, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: [queryKey[0], queryKey[1]] });
    toast({ title: isEdit ? 'Изменения сохранены' : 'Запись создана' });
    onSuccess();
  }

  const editableFields = schema.fields.filter((f) => !f.readonly && !f.hidden);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Редактировать ${schema.nameSingular}` : `Добавить ${schema.nameSingular}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
          {editableFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}{f.required && <span className="text-destructive ml-1">*</span>}</Label>
              {f.type === 'textarea' ? (
                <Textarea {...register(f.key)} rows={3} />
              ) : f.type === 'boolean' ? (
                <Controller name={f.key} control={control}
                  render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              ) : f.type === 'select' ? (
                <Controller name={f.key} control={control}
                  render={({ field }) => (
                    <Select value={field.value as string || 'NONE'} onValueChange={(v) => field.onChange(v === 'NONE' ? null : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {!f.required && <SelectItem value="NONE">— Не выбрано —</SelectItem>}
                        {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
              ) : f.type === 'color' ? (
                <div className="flex items-center gap-2">
                  <input type="color" {...register(f.key)} className="h-8 w-14 cursor-pointer rounded border p-0" />
                  <Input {...register(f.key)} placeholder="#000000" className="max-w-32 font-mono" />
                </div>
              ) : (
                <Input
                  {...register(f.key)}
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                />
              )}
              {errors[f.key] && (
                <p className="text-xs text-destructive">{String((errors[f.key] as { message?: string })?.message ?? '')}</p>
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
