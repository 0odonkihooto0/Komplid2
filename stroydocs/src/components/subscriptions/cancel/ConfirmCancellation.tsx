'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CancellationReasonCode } from '@prisma/client';
import { Button } from '@/components/ui/button';

interface Props {
  subscriptionId: string;
  reason: CancellationReasonCode | null;
  feedback?: string;
  effectiveEndDate: string;
  onBack: () => void;
}

export function ConfirmCancellation({
  subscriptionId,
  reason,
  feedback,
  effectiveEndDate,
  onBack,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dateStr = new Date(effectiveEndDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason ?? undefined, feedback }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) {
        setError(json.error ?? 'Произошла ошибка');
        return;
      }
      setDone(true);
    } catch {
      setError('Не удалось отменить подписку. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">✓</div>
        <h2 className="text-lg font-semibold">Подписка отменена</h2>
        <p className="text-sm text-muted-foreground">
          Доступ к платным функциям сохраняется до <strong>{dateStr}</strong>.
          После этой даты аккаунт переходит на бесплатный тариф.
        </p>
        <p className="text-sm text-muted-foreground">
          Изменили решение?{' '}
          <Link
            href="/settings/subscription"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Восстановить подписку
          </Link>
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/settings/subscription">К настройкам подписки</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Подтвердите отмену</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Подписка останется активной до <strong>{dateStr}</strong>. После этой даты аккаунт
          перейдёт на бесплатный тариф.
        </p>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-1">
        <p className="font-medium text-destructive">После отмены будет недоступно:</p>
        <ul className="text-muted-foreground list-disc list-inside space-y-0.5">
          <li>Исполнительная документация (АОСР, ОЖР)</li>
          <li>КС-2 / КС-3 / КС-6а</li>
          <li>Строительный контроль и дефектовка</li>
          <li>Импорт и аналитика смет</li>
        </ul>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        variant="destructive"
        className="w-full"
        onClick={handleCancel}
        disabled={loading}
      >
        {loading ? 'Отменяем подписку…' : 'Отменить подписку'}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Назад
      </button>
    </div>
  );
}
