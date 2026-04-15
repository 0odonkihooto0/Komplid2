'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { usePrescriptions, usePrescription } from './usePrescriptions';
import type { DefectInPrescription } from './usePrescriptions';
import { useCreateRemediationAct } from './useRemediationActs';

interface Props {
  objectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABELS: Record<string, string> = {
  DEFECT_ELIMINATION: 'Устранение недостатков',
  WORK_SUSPENSION:    'Приостановка работ',
};

function makeActNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `АУ-${y}${m}${d}`;
}

export function CreateRemediationDialog({ objectId, open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [selectedDefectIds, setSelectedDefectIds] = useState<string[]>([]);
  const [forcedDefectIds, setForcedDefectIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, { measures: string; note: string }>>({});
  const [number, setNumber] = useState(makeActNumber);

  // Все хуки до return
  const { toast } = useToast();
  const { data: prescriptionsData, isLoading: loadingPrescriptions } = usePrescriptions(
    objectId,
    { status: 'ACTIVE' },
  );
  const { data: prescriptionDetail, isLoading: loadingDefects } = usePrescription(
    objectId,
    prescriptionId,
  );
  const createMutation = useCreateRemediationAct(objectId);

  const prescriptions = prescriptionsData?.data ?? [];
  const defects = prescriptionDetail?.defects ?? [];
  const selectedPrescription = prescriptions.find((p) => p.id === prescriptionId);

  const handleClose = useCallback(() => {
    setStep(1);
    setPrescriptionId('');
    setSelectedDefectIds([]);
    setForcedDefectIds([]);
    setDetails({});
    setNumber(makeActNumber());
    onOpenChange(false);
  }, [onOpenChange]);

  const toggleDefect = useCallback((id: string) => {
    setSelectedDefectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    // При снятии чекбокса убираем из форсированных
    setForcedDefectIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const handleForceAdd = useCallback((d: DefectInPrescription) => {
    setForcedDefectIds((prev) => (prev.includes(d.id) ? prev : [...prev, d.id]));
    setSelectedDefectIds((prev) => (prev.includes(d.id) ? prev : [...prev, d.id]));
    toast({
      title: 'Внимание: дублирование недостатка',
      description: `Недостаток уже включён в акт устранения №${d.pendingRemediationActNumber} (на проверке). Будут учтены мероприятия из акта, отправленного первым.`,
      variant: 'destructive',
    });
  }, [toast]);

  const setDetail = useCallback((defectId: string, field: 'measures' | 'note', value: string) => {
    setDetails((prev) => {
      const existing = prev[defectId] ?? { measures: '', note: '' };
      return { ...prev, [defectId]: { ...existing, [field]: value } };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedPrescription) return;
    const remediationDetails: Record<string, { measures: string; note?: string }> = {};
    for (const id of selectedDefectIds) {
      const d = details[id];
      remediationDetails[id] = { measures: d?.measures ?? '', note: d?.note || undefined };
    }
    createMutation.mutate(
      {
        number,
        inspectionId: selectedPrescription.inspection.id,
        prescriptionId,
        defectIds: selectedDefectIds,
        remediationDetails,
      },
      { onSuccess: handleClose },
    );
  }, [selectedPrescription, selectedDefectIds, details, number, prescriptionId, createMutation, handleClose]);

  const canNext2 = !!prescriptionId;
  const canNext3 = selectedDefectIds.length > 0;
  const canSubmit = number.trim().length > 0
    && selectedDefectIds.every((id) => (details[id]?.measures ?? '').trim().length > 0);

  const stepLabels = ['Предписание', 'Недостатки', 'Мероприятия'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Создать акт устранения недостатков</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Шаг {step} из 3 — {stepLabels[step - 1]}
          </p>
        </DialogHeader>

        {/* Шаг 1 — Выбор предписания */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            {loadingPrescriptions ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={prescriptionId} onValueChange={setPrescriptionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предписание..." />
                </SelectTrigger>
                <SelectContent>
                  {prescriptions.length === 0 && (
                    <SelectItem value="_empty" disabled>
                      Нет активных предписаний
                    </SelectItem>
                  )}
                  {prescriptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      №{p.number} — {TYPE_LABELS[p.type] ?? p.type} ({p._count.defects} недост.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Шаг 2 — Выбор недостатков */}
        {step === 2 && (
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {loadingDefects ? (
              <Skeleton className="h-40 w-full" />
            ) : defects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет недостатков в этом предписании</p>
            ) : (
              defects.map((d) => {
                const isPending = !!d.pendingRemediationActId;
                const isForced = forcedDefectIds.includes(d.id);
                const isDisabled = isPending && !isForced;

                return (
                  <div key={d.id} className="rounded-md border p-3 space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={selectedDefectIds.includes(d.id)}
                        onCheckedChange={() => !isDisabled && toggleDefect(d.id)}
                        disabled={isDisabled}
                        className="mt-0.5"
                      />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">{d.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs">{d.category}</Badge>
                          <Badge variant="outline" className="text-xs">{d.status}</Badge>
                          {isPending && (
                            <Badge
                              variant="outline"
                              className="text-xs border-amber-400 text-amber-700 bg-amber-50 flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                              Уже на проверке в акте №{d.pendingRemediationActNumber}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                    {/* Кнопка принудительного добавления для заблокированных дефектов */}
                    {isDisabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-amber-700 border-amber-400 hover:bg-amber-50"
                        onClick={() => handleForceAdd(d)}
                      >
                        Всё равно добавить
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Шаг 3 — Мероприятия по каждому недостатку */}
        {step === 3 && (
          <div className="space-y-4 py-2 max-h-96 overflow-y-auto">
            <div className="space-y-1">
              <Label>Номер акта</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            {selectedDefectIds.map((id) => {
              const defect = defects.find((d) => d.id === id);
              return (
                <div key={id} className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">{defect?.title ?? id}</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Мероприятия по устранению *</Label>
                    <Textarea
                      rows={2}
                      placeholder="Опишите мероприятия..."
                      value={details[id]?.measures ?? ''}
                      onChange={(e) => setDetail(id, 'measures', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Примечание</Label>
                    <Textarea
                      rows={1}
                      placeholder="Дополнительно..."
                      value={details[id]?.note ?? ''}
                      onChange={(e) => setDetail(id, 'note', e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              Назад
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          {step < 3 && (
            <Button
              disabled={step === 1 ? !canNext2 : !canNext3}
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            >
              Далее
            </Button>
          )}
          {step === 3 && (
            <Button
              disabled={!canSubmit || createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать акт'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
