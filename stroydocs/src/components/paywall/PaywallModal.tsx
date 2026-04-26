'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FEATURE_LABELS } from '@/utils/feature-labels';
import type { FeatureCode } from '@/lib/features/codes';

interface Props {
  feature: FeatureCode;
  planName: string | null;
  planCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallModal({ feature, planName, planCode, isOpen, onClose }: Props) {
  const featureLabel = FEATURE_LABELS[feature] ?? String(feature);
  const trialHref = planCode && planCode !== 'free'
    ? `/settings/subscription/checkout/${planCode}?period=MONTHLY`
    : '/pricing';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-4 w-4 text-primary" />
            </div>
          </div>
          <DialogTitle>
            {planName
              ? `Эта функция доступна на тарифе «${planName}»`
              : 'Функция недоступна в вашем тарифе'}
          </DialogTitle>
          <DialogDescription>
            <strong>{featureLabel}</strong> — платная функция StroyDocs.
            Обновите тариф, чтобы разблокировать её.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href="/pricing" onClick={onClose}>
              Посмотреть тарифы →
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={trialHref} onClick={onClose}>
              Попробовать 7 дней бесплатно
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
