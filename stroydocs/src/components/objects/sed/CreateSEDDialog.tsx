'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { createSEDSchema } from '@/lib/validations/sed';
// Тип для contract-based участников (агрегация ContractParticipant)
interface ObjectParticipantItem {
  organization: { id: string; name: string; inn: string; sroNumber: string | null };
  roles: string[];
  contracts: Array<{ id: string; number: string; name: string | null }>;
}

const DOC_TYPE_OPTIONS = [
  { value: 'LETTER', label: 'Письмо' },
  { value: 'ORDER', label: 'Приказ' },
  { value: 'PROTOCOL', label: 'Протокол' },
  { value: 'ACT', label: 'Акт' },
  { value: 'MEMO', label: 'Докладная записка' },
  { value: 'NOTIFICATION', label: 'Уведомление' },
  { value: 'OTHER', label: 'Иное' },
] as const;

const formSchema = createSEDSchema.omit({ tags: true, receiverOrgIds: true, date: true }).extend({
  tagsInput: z.string().optional(),
  receiverOrgIds: z.array(z.string()).min(1, 'Укажите хотя бы одного получателя'),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

export function CreateSEDDialog({ open, onOpenChange, objectId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const { data: participants = [] } = useQuery<ObjectParticipantItem[]>({
    queryKey: ['object-participants', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/participants`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const orgOptions = participants.map((p) => ({ id: p.organization.id, name: p.organization.name }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { docType: 'LETTER', title: '', senderOrgId: '', receiverOrgIds: [], tagsInput: '' },
  });

  const close = () => {
    form.reset();
    setStep(1);
    onOpenChange(false);
  };

  const createMutation = useMutation({
    mutationFn: async ({ values, activate }: { values: FormValues; activate: boolean }) => {
      const payload = {
        docType: values.docType,
        title: values.title,
        body: values.body,
        senderOrgId: values.senderOrgId,
        receiverOrgIds: values.receiverOrgIds,
        tags: values.tagsInput ? values.tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`/api/projects/${objectId}/sed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания документа');
      const created = json.data as { id: string };

      if (activate) {
        await fetch(`/api/projects/${objectId}/sed/${created.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
      }
      return created;
    },
    onSuccess: (_data, { activate }) => {
      queryClient.invalidateQueries({ queryKey: ['sed', objectId] });
      toast({ title: activate ? 'Документ создан и активирован' : 'Черновик сохранён' });
      close();
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (activate: boolean) => {
    form.handleSubmit((values) => createMutation.mutate({ values, activate }))();
  };

  const step1Fields = ['docType', 'title', 'senderOrgId', 'receiverOrgIds'] as const;
  const step2Fields = ['body'] as const;

  const receiverOrgIds = form.watch('receiverOrgIds');

  const toggleReceiver = (orgId: string) => {
    const current = form.getValues('receiverOrgIds');
    form.setValue(
      'receiverOrgIds',
      current.includes(orgId) ? current.filter((id) => id !== orgId) : [...current, orgId],
      { shouldValidate: true }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Новый документ СЭД — Реквизиты'}
            {step === 2 && 'Новый документ СЭД — Содержание'}
            {step === 3 && 'Новый документ СЭД — Маршрут'}
          </DialogTitle>
          <DialogDescription className="sr-only">Шаг {step} из 3</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип документа</Label>
              <Select value={form.watch('docType')} onValueChange={(v) => form.setValue('docType', v as FormValues['docType'])}>
                <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input placeholder="Введите заголовок документа" {...form.register('title')} />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Организация-отправитель</Label>
              <Select value={form.watch('senderOrgId')} onValueChange={(v) => form.setValue('senderOrgId', v)}>
                <SelectTrigger><SelectValue placeholder="Выберите организацию" /></SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.senderOrgId && <p className="text-xs text-destructive">{form.formState.errors.senderOrgId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Организации-получатели</Label>
              <div className="space-y-1 max-h-36 overflow-y-auto border rounded-md p-2">
                {orgOptions.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={receiverOrgIds.includes(o.id)}
                      onCheckedChange={() => toggleReceiver(o.id)}
                    />
                    {o.name}
                  </label>
                ))}
                {orgOptions.length === 0 && <p className="text-xs text-muted-foreground">Нет участников проекта</p>}
              </div>
              {form.formState.errors.receiverOrgIds && <p className="text-xs text-destructive">{form.formState.errors.receiverOrgIds.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Теги (через запятую)</Label>
              <Input placeholder="письмо, уведомление, срочно" {...form.register('tagsInput')} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Текст документа</Label>
              <Textarea rows={8} placeholder="Введите содержание документа..." {...form.register('body')} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Маршрут согласования можно запустить из карточки документа после его создания.
              Нажмите «Запустить согласование» в карточке, чтобы отправить документ участникам.
            </p>
            <p className="text-sm">Выберите действие:</p>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={close}>Отмена</Button>
              <Button onClick={() => form.trigger(step1Fields as unknown as (keyof FormValues)[]).then((ok) => ok && setStep(2))}>Далее →</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>← Назад</Button>
              <Button onClick={() => form.trigger(step2Fields as unknown as (keyof FormValues)[]).then((ok) => ok && setStep(3))}>Далее →</Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>← Назад</Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={createMutation.isPending} onClick={() => handleSubmit(false)}>Сохранить черновик</Button>
                <Button disabled={createMutation.isPending} onClick={() => handleSubmit(true)}>Создать и активировать</Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
