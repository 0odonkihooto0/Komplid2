'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { createCorrespondenceSchema } from '@/lib/validations/correspondence';
// Тип для contract-based участников (агрегация ContractParticipant)
interface ObjectParticipantItem {
  organization: { id: string; name: string; inn: string; sroNumber: string | null };
  roles: string[];
  contracts: Array<{ id: string; number: string; name: string | null }>;
}
import { z } from 'zod';

// Форма использует tagsInput (строка) вместо tags (массив)
const formSchema = createCorrespondenceSchema.omit({ tags: true, sentAt: true }).extend({
  tagsInput: z.string().optional(),
  sentAtDate: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

export function CreateCorrespondenceDialog({ open, onOpenChange, objectId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { direction: 'OUTGOING', subject: '', senderOrgId: '', receiverOrgId: '', tagsInput: '', sentAtDate: '' },
  });

  const close = () => {
    form.reset();
    setStep(1);
    onOpenChange(false);
  };

  const createMutation = useMutation({
    mutationFn: async ({ values, send }: { values: FormValues; send: boolean }) => {
      const payload = {
        direction: values.direction,
        subject: values.subject,
        body: values.body,
        senderOrgId: values.senderOrgId,
        receiverOrgId: values.receiverOrgId,
        tags: values.tagsInput ? values.tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [],
        sentAt: values.sentAtDate ? new Date(values.sentAtDate).toISOString() : undefined,
      };
      const res = await fetch(`/api/projects/${objectId}/correspondence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания письма');
      const created = json.data as { id: string };

      if (send) {
        const sendRes = await fetch(`/api/projects/${objectId}/correspondence/${created.id}/send`, { method: 'POST' });
        const sendJson = await sendRes.json();
        if (!sendJson.success) throw new Error(sendJson.error ?? 'Ошибка отправки');
      }
      return created;
    },
    onSuccess: (_data, { send }) => {
      queryClient.invalidateQueries({ queryKey: ['correspondence', objectId] });
      toast({ title: send ? 'Письмо отправлено' : 'Черновик сохранён' });
      close();
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (send: boolean) => {
    form.handleSubmit((values) => createMutation.mutate({ values, send }))();
  };

  const orgOptions = participants.map((p) => ({ id: p.organization.id, name: p.organization.name }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Новое письмо — Реквизиты' : 'Новое письмо — Содержание'}</DialogTitle>
          <DialogDescription className="sr-only">Шаг {step} из 2</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {/* Направление */}
            <div className="space-y-2">
              <Label>Направление</Label>
              <div className="flex gap-4">
                {(['OUTGOING', 'INCOMING'] as const).map((dir) => (
                  <label key={dir} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" value={dir} {...form.register('direction')} />
                    {dir === 'OUTGOING' ? '→ Исходящее' : '← Входящее'}
                  </label>
                ))}
              </div>
            </div>
            {/* Отправитель */}
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
            {/* Получатель */}
            <div className="space-y-2">
              <Label>Организация-получатель</Label>
              <Select value={form.watch('receiverOrgId')} onValueChange={(v) => form.setValue('receiverOrgId', v)}>
                <SelectTrigger><SelectValue placeholder="Выберите организацию" /></SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.receiverOrgId && <p className="text-xs text-destructive">{form.formState.errors.receiverOrgId.message}</p>}
            </div>
            {/* Тема */}
            <div className="space-y-2">
              <Label>Тема письма</Label>
              <Input placeholder="Укажите тему" {...form.register('subject')} />
              {form.formState.errors.subject && <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>}
            </div>
            {/* Дата */}
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" {...form.register('sentAtDate')} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Текст письма</Label>
              <Textarea rows={6} placeholder="Введите содержание письма..." {...form.register('body')} />
            </div>
            <div className="space-y-2">
              <Label>Теги (через запятую)</Label>
              <Input placeholder="АОСР, акт, уведомление" {...form.register('tagsInput')} />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={close}>Отмена</Button>
              <Button onClick={() => form.trigger(['direction', 'senderOrgId', 'receiverOrgId', 'subject']).then((ok) => ok && setStep(2))}>Далее →</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>← Назад</Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={createMutation.isPending} onClick={() => handleSubmit(false)}>Сохранить черновик</Button>
                <Button disabled={createMutation.isPending} onClick={() => handleSubmit(true)}>Отправить</Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
