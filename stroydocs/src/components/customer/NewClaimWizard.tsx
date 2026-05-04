'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';

// Типы претензий согласно ClaimType enum
const CLAIM_TYPES = [
  { value: 'QUALITY_ISSUE', label: 'Нарушение качества работ' },
  { value: 'DELAY', label: 'Нарушение сроков' },
  { value: 'OVERBILLING', label: 'Завышение стоимости' },
  { value: 'MISSING_DOCUMENTS', label: 'Отсутствие документов' },
  { value: 'WARRANTY_VIOLATION', label: 'Нарушение гарантии' },
  { value: 'PRE_COURT', label: 'Досудебная претензия' },
  { value: 'CONTRACT_TERMINATION', label: 'Расторжение договора' },
] as const;

type ClaimTypeValue = (typeof CLAIM_TYPES)[number]['value'];

interface FormValues {
  recipientName: string;
  senderName: string;
  issueDescription: string;
  requestedAction: string;
  deadline?: string;
  contractNumber?: string;
}

interface Props {
  projectId: string;
  onSuccess?: () => void;
}

export default function NewClaimWizard({ projectId, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [claimType, setClaimType] = useState<ClaimTypeValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>();

  const selectedTypeLabel = CLAIM_TYPES.find((t) => t.value === claimType)?.label ?? '';

  const onSubmit = async (data: FormValues) => {
    if (!claimType) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/customer/projects/${projectId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, claimType }),
      });
      const json: { success: boolean; error?: string } = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ title: 'Претензия создана' });
      onSuccess?.();
    } catch (e) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Шаг 1: выбор типа претензии
  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Выберите тип претензии:</p>
        <div className="grid gap-2">
          {CLAIM_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => setClaimType(ct.value)}
              className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                claimType === ct.value
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setStep(2)} disabled={!claimType} className="w-full">
          Далее
        </Button>
      </div>
    );
  }

  // Шаг 2: заполнение полей
  if (step === 2) {
    return (
      <form className="space-y-4" onSubmit={handleSubmit(() => setStep(3))}>
        <div className="space-y-1">
          <Label htmlFor="recipientName">Кому (получатель) *</Label>
          <Input id="recipientName" {...register('recipientName', { required: true })} />
          {errors.recipientName && <p className="text-xs text-destructive">Обязательное поле</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="senderName">От кого (отправитель) *</Label>
          <Input id="senderName" {...register('senderName', { required: true })} />
          {errors.senderName && <p className="text-xs text-destructive">Обязательное поле</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="issueDescription">Описание нарушения *</Label>
          <Textarea id="issueDescription" rows={3} {...register('issueDescription', { required: true })} />
          {errors.issueDescription && <p className="text-xs text-destructive">Обязательное поле</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="requestedAction">Требуемые действия *</Label>
          <Textarea id="requestedAction" rows={2} {...register('requestedAction', { required: true })} />
          {errors.requestedAction && <p className="text-xs text-destructive">Обязательное поле</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="deadline">Срок устранения (необязательно)</Label>
          <Input id="deadline" type="date" {...register('deadline')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contractNumber">Номер договора (необязательно)</Label>
          <Input id="contractNumber" {...register('contractNumber')} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setStep(1)}>Назад</Button>
          <Button type="submit" className="flex-1">Далее — предпросмотр</Button>
        </div>
      </form>
    );
  }

  // Шаг 3: предпросмотр перед отправкой
  const preview = getValues();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/20">
        <p><span className="font-medium">Тип претензии:</span> {selectedTypeLabel}</p>
        <p><span className="font-medium">Кому:</span> {preview.recipientName}</p>
        <p><span className="font-medium">От кого:</span> {preview.senderName}</p>
        {preview.contractNumber && <p><span className="font-medium">Договор №:</span> {preview.contractNumber}</p>}
        {preview.deadline && <p><span className="font-medium">Срок:</span> {preview.deadline}</p>}
        <p><span className="font-medium">Нарушение:</span> {preview.issueDescription}</p>
        <p><span className="font-medium">Требования:</span> {preview.requestedAction}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep(2)}>Назад</Button>
        <Button
          className="flex-1"
          disabled={isSubmitting}
          onClick={handleSubmit(onSubmit)}
        >
          {isSubmitting ? 'Отправка...' : 'Создать претензию'}
        </Button>
      </div>
    </div>
  );
}
