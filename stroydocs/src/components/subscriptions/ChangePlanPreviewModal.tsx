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
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import type { SubscriptionPlan } from '@prisma/client';

interface ProrationData {
  unusedCreditRub: number;
  newPlanCostRub: number;
  amountToChargeRub: number;
  daysRemaining: number;
  totalDays: number;
  periodEnd: string;
}

interface SavedCard {
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
}

interface PreviewData {
  direction: 'upgrade' | 'same';
  proration: ProrationData;
  hasSavedCard: boolean;
  savedCard: SavedCard | null;
}

interface Props {
  subscriptionId: string;
  newPlan: SubscriptionPlan;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  open: boolean;
  onClose: () => void;
}

function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0 });
}

export function ChangePlanPreviewModal({ subscriptionId, newPlan, billingPeriod, open, onClose }: Props) {
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
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки превью');
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
      const res = await fetch(`/api/subscriptions/${subscriptionId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanCode: newPlan.code }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка апгрейда');

      if (json.data.charged) {
        toast({ title: 'Тариф изменён', description: `Вы перешли на ${newPlan.name}` });
        onClose();
        router.refresh();
      } else if (json.data.confirmationToken) {
        // Редирект на checkout (нет сохранённой карты)
        onClose();
        router.push(`/settings/subscription/checkout/${newPlan.code}?period=${billingPeriod}`);
      }
    } catch (e) {
      toast({
        title: 'Ошибка',
        description: e instanceof Error ? e.message : 'Не удалось выполнить апгрейд',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  }

  const proration = preview?.proration;
  const periodEndDate = proration ? new Date(proration.periodEnd).toLocaleDateString('ru-RU') : '';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Переход на {newPlan.name}</DialogTitle>
          <DialogDescription>
            Доплата за оставшиеся дни текущего периода
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

        {proration && !loading && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Кредит за текущий тариф ({proration.daysRemaining} из {proration.totalDays} дн.)</span>
                <span className="text-green-600">−{formatRub(proration.unusedCreditRub)} ₽</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Новый тариф за остаток</span>
                <span>+{formatRub(proration.newPlanCostRub)} ₽</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>К оплате сейчас</span>
                <span>{formatRub(proration.amountToChargeRub)} ₽</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Следующее полное списание — {periodEndDate}
              </p>
            </div>

            {preview?.hasSavedCard && preview.savedCard ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4 flex-shrink-0" aria-hidden />
                <span>
                  Карта {preview.savedCard.cardBrand ?? ''} **** {preview.savedCard.cardLast4 ?? ''}
                  {preview.savedCard.cardExpiryMonth && preview.savedCard.cardExpiryYear
                    ? ` (до ${String(preview.savedCard.cardExpiryMonth).padStart(2, '0')}/${preview.savedCard.cardExpiryYear})`
                    : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded p-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
                <span>Сохранённая карта не найдена — вы будете перенаправлены на страницу оплаты</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || confirming || !!error}
            className="min-w-[140px]"
          >
            {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {preview?.hasSavedCard ? 'Подтвердить оплату' : 'Перейти к оплате'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
