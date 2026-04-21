'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import type { SubscriptionPlan } from '@prisma/client';

interface ExceedingLimit {
  field: string;
  label: string;
  current: number;
  limit: number;
}

interface PreviewData {
  direction: 'downgrade';
  exceedingLimits: ExceedingLimit[];
  effectiveAt: string;
}

interface Props {
  subscriptionId: string;
  newPlan: SubscriptionPlan;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  open: boolean;
  onClose: () => void;
}

export function DowngradeWarningModal({ subscriptionId, newPlan, billingPeriod, open, onClose }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/subscriptions/${subscriptionId}/preview-change?planId=${newPlan.id}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      setPreview(json.data as PreviewData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [subscriptionId, newPlan.id]);

  useEffect(() => {
    if (open) fetchPreview();
  }, [open, fetchPreview]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/downgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanCode: newPlan.code }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');

      const effectiveDate = json.data.scheduledAt
        ? new Date(json.data.scheduledAt as string).toLocaleDateString('ru-RU')
        : '';

      toast({
        title: 'Даунгрейд запланирован',
        description: `Тариф ${newPlan.name} начнёт действовать ${effectiveDate}`,
      });
      onClose();
      router.refresh();
    } catch (e) {
      toast({
        title: 'Ошибка',
        description: e instanceof Error ? e.message : 'Не удалось запланировать даунгрейд',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  }

  const effectiveDate = preview?.effectiveAt
    ? new Date(preview.effectiveAt).toLocaleDateString('ru-RU')
    : '';

  const hasExceeded = (preview?.exceedingLimits.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Переход на {newPlan.name}</DialogTitle>
          <DialogDescription>
            Тариф будет понижен в конце текущего периода
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden />
            {error}
          </div>
        )}

        {preview && !loading && (
          <div className="space-y-4">
            {hasExceeded && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
                  <span>После перехода вы превысите лимиты нового тарифа</span>
                </div>
                <ul className="space-y-1">
                  {preview.exceedingLimits.map((limit) => (
                    <li key={limit.field} className="text-sm text-amber-700">
                      <span className="font-medium">{limit.label}:</span>{' '}
                      у вас {limit.current}, допускается {limit.limit}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600">
                  Данные сверх лимитов перейдут в режим readonly. Вы сможете восстановить доступ при апгрейде.
                </p>
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              Новый тариф начнёт действовать:{' '}
              <span className="font-medium text-foreground">{effectiveDate}</span>
              <br />
              До этой даты вы продолжаете работать по текущему тарифу. Возврат средств не производится.
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Отмена
          </Button>
          <Button
            variant={hasExceeded ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading || confirming || !!error}
            className="min-w-[180px]"
          >
            {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Подтвердить понижение
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
