'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PaymentMethod } from '@prisma/client';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';

interface Props {
  initialMethods: PaymentMethod[];
}

export function PaymentMethodsManager({ initialMethods }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка при удалении');
      router.refresh();
    } catch {
      // показать toast или просто обновить
    } finally {
      setDeletingId(null);
    }
  }, [router]);

  const handleSetDefault = useCallback(async (id: string) => {
    setSettingDefaultId(id);
    try {
      const res = await fetch(`/api/payment-methods/${id}/default`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Ошибка');
      router.refresh();
    } catch {
      // ignore
    } finally {
      setSettingDefaultId(null);
    }
  }, [router]);

  if (initialMethods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Способов оплаты пока нет. Карта сохраняется автоматически при следующей оплате подписки.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialMethods.map((method) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
          isDeleting={deletingId === method.id}
          isSettingDefault={settingDefaultId === method.id}
        />
      ))}
    </div>
  );
}
