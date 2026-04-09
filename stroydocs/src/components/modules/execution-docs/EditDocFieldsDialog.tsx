'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEditDocFields } from './useEditDocFields';
import type { ExecutionDocType, ExecutionDocStatus } from '@prisma/client';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  contractId: string;
  docId: string;
  docType: ExecutionDocType;
  docStatus: ExecutionDocStatus;
  currentOverrideFields?: Record<string, string> | null;
}

const schema = z.record(z.string(), z.string());
type FormData = Record<string, string>;

/** Описание полей формы по типу документа */
const FIELDS_BY_TYPE: Record<string, Array<{ name: string; label: string; multiline?: boolean }>> = {
  AOSR: [
    { name: 'location', label: 'Место проведения работ' },
    { name: 'normative', label: 'Нормативный документ (СНиП/СП/ГОСТ)' },
    { name: 'description', label: 'Описание работ', multiline: true },
    { name: 'workDate', label: 'Дата выполнения работ' },
    { name: 'number', label: 'Номер акта' },
    { name: 'date', label: 'Дата составления' },
  ],
  OZR: [
    { name: 'number', label: 'Номер ОЖР' },
    { name: 'date', label: 'Дата составления' },
    { name: 'section3Text', label: 'Раздел 3 — Перечень выполненных работ', multiline: true },
    { name: 'section5Text', label: 'Раздел 5 — Сведения о контроле', multiline: true },
  ],
  TECHNICAL_READINESS_ACT: [
    { name: 'number', label: 'Номер акта' },
    { name: 'date', label: 'Дата составления' },
  ],
};

export function EditDocFieldsDialog({
  open,
  onClose,
  projectId,
  contractId,
  docId,
  docType,
  docStatus,
  currentOverrideFields,
}: Props) {
  const { saveAndRegenerate, isPending } = useEditDocFields(projectId, contractId, docId);

  const fields = FIELDS_BY_TYPE[docType] ?? FIELDS_BY_TYPE.AOSR;
  const defaultValues = Object.fromEntries(
    fields.map((f) => [f.name, currentOverrideFields?.[f.name] ?? ''])
  );

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const isInReview = docStatus === 'IN_REVIEW';
  const isReadOnly = docStatus === 'SIGNED';

  const onSubmit = async (data: FormData) => {
    // Фильтруем пустые поля — не переопределяем то, что не заполнено
    const nonEmpty = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v.trim() !== '')
    );
    await saveAndRegenerate(nonEmpty);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать поля документа</DialogTitle>
        </DialogHeader>

        {isReadOnly && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Документ подписан — редактирование недоступно.</AlertDescription>
          </Alert>
        )}

        {isInReview && !isReadOnly && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Сохранение пересохранит поля, но статус документа останется «На проверке». Согласование не сбрасывается.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.multiline ? (
                <Textarea
                  id={field.name}
                  disabled={isReadOnly}
                  rows={3}
                  {...register(field.name)}
                />
              ) : (
                <Input
                  id={field.name}
                  disabled={isReadOnly}
                  {...register(field.name)}
                />
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Сохранить и перегенерировать PDF'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
