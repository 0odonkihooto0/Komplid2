'use client';

import { useEffect, useState } from 'react';
import { CancellationReasonCode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Причины без retention-предложения — сразу переходим к подтверждению
const NO_OFFER_REASONS: CancellationReasonCode[] = [
  'COMPETITOR',
  'TECHNICAL_ISSUES',
  'TEMPORARY',
  'OTHER',
];

interface Props {
  subscriptionId: string;
  reason: CancellationReasonCode;
  onAccepted: () => void;
  onDecline: () => void;
}

export function RetentionOffer({ subscriptionId, reason, onAccepted, onDecline }: Props) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  // Для причин без оффера — сразу перейти к шагу 3
  useEffect(() => {
    if (NO_OFFER_REASONS.includes(reason)) {
      onDecline();
    }
  }, [reason, onDecline]);

  if (NO_OFFER_REASONS.includes(reason)) return null;

  const applyOffer = async (offerType: 'PROMO_CODE' | 'PAUSE' | 'FEEDBACK') => {
    setLoading(true);
    try {
      await fetch(`/api/subscriptions/${subscriptionId}/apply-retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerType, feedback: feedback.trim() || undefined }),
      });
      onAccepted();
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (reason === 'TOO_EXPENSIVE') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Специальное предложение для вас</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Оставайтесь и получите скидку 30% на следующие 3 месяца
          </p>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3 text-center">
          <p className="text-3xl font-bold text-primary">−30%</p>
          <p className="text-sm text-muted-foreground">на 3 месяца при следующем продлении</p>
          <div className="flex items-center justify-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-base px-4 py-1.5 cursor-pointer select-all"
              onClick={() => copyCode('SKIDKA30-3M')}
            >
              SKIDKA30-3M
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => copyCode('SKIDKA30-3M')}>
              {copied ? 'Скопировано!' : 'Копировать'}
            </Button>
          </div>
        </div>

        <Button className="w-full" onClick={() => applyOffer('PROMO_CODE')} disabled={loading}>
          {loading ? 'Применяем…' : 'Применить скидку и остаться'}
        </Button>
        <button
          type="button"
          onClick={onDecline}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Всё равно отменить
        </button>
      </div>
    );
  }

  if (reason === 'NOT_USING') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Поставим на паузу?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Мы можем связаться с вами, когда будет удобно вернуться. Подписка сохранится.
          </p>
        </div>

        <div className="rounded-xl border p-5 space-y-2">
          <p className="font-medium">Пауза на 30 дней</p>
          <p className="text-sm text-muted-foreground">
            Напомним вам через месяц — никаких лишних списаний.
          </p>
        </div>

        <Button className="w-full" onClick={() => applyOffer('PAUSE')} disabled={loading}>
          {loading ? 'Отправляем…' : 'Написать мне потом'}
        </Button>
        <button
          type="button"
          onClick={onDecline}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Всё равно отменить
        </button>
      </div>
    );
  }

  if (reason === 'MISSING_FEATURES') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Ваши пожелания важны для нас</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Расскажите, что добавить — мы читаем каждый отзыв и публикуем план развития.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feature-feedback">Что вам нужно?</Label>
          <Textarea
            id="feature-feedback"
            placeholder="Опишите нужные функции…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            maxLength={2000}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Посмотрите наш{' '}
          <a
            href="https://stroydocs.ru/roadmap"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            план развития
          </a>{' '}
          — возможно, нужная функция уже в работе.
        </p>

        <Button
          className="w-full"
          onClick={() => applyOffer('FEEDBACK')}
          disabled={loading || !feedback.trim()}
        >
          {loading ? 'Отправляем…' : 'Отправить отзыв'}
        </Button>
        <button
          type="button"
          onClick={onDecline}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Всё равно отменить
        </button>
      </div>
    );
  }

  return null;
}
