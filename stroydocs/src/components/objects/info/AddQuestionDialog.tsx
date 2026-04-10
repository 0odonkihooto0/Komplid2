'use client';

import { useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProblemIssueType } from '@prisma/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { QUESTION_TYPE_LABELS } from './ProblematicQuestionsView';
import { useCreateQuestion, useObjectOrgs } from './useProblematicQuestions';

const schema = z.object({
  type:           z.nativeEnum(ProblemIssueType),
  description:    z.string().min(1, 'Введите описание'),
  causes:         z.string().optional(),
  assigneeOrgId:  z.string().optional(),
  verifierOrgId:  z.string().optional(),
  measuresTaken:  z.string().optional(),
  resolutionDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  objectId:     string;
}

export function AddQuestionDialog({ open, onOpenChange, objectId }: Props) {
  const createMutation = useCreateQuestion(objectId);
  const { data: orgs = [] } = useObjectOrgs(objectId);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: ProblemIssueType.OTHER, description: '' },
  });

  function onSubmit(values: FormValues) {
    const resolutionDate = values.resolutionDate
      ? new Date(values.resolutionDate).toISOString()
      : undefined;

    createMutation.mutate(
      { ...values, resolutionDate },
      {
        onSuccess: async (created) => {
          // Загрузка файлов если выбраны
          const files = fileRef.current?.files;
          if (files && files.length > 0) {
            await Promise.all(Array.from(files).map(async (file) => {
              const res = await fetch(
                `/api/projects/${objectId}/questions/${created.id}/attachments`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
                }
              );
              const json = await res.json();
              if (json.success) {
                await fetch(json.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
              }
            }));
          }
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новый проблемный вопрос</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Тип вопроса</Label>
            <Controller name="type" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ProblemIssueType).map((t) => (
                    <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-1">
            <Label>Проблемный вопрос <span className="text-destructive">*</span></Label>
            <Textarea {...register('description')} rows={3} placeholder="Опишите проблему" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Причины возникновения</Label>
            <Textarea {...register('causes')} rows={2} placeholder="Укажите причины" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Исполнитель</Label>
              <Controller name="assigneeOrgId" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.organizationId} value={o.organizationId}>
                        {o.organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Проверяющий</Label>
              <Controller name="verifierOrgId" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.organizationId} value={o.organizationId}>
                        {o.organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Предпринятые меры</Label>
            <Textarea {...register('measuresTaken')} rows={2} placeholder="Опишите предпринятые меры" />
          </div>

          <div className="space-y-1">
            <Label>Дата решения</Label>
            <input type="date" {...register('resolutionDate')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>

          <div className="space-y-1">
            <Label>Файлы</Label>
            <input type="file" multiple ref={fileRef}
              className="text-sm file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
