'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SubscriptionPlan } from '@prisma/client';

// Типы для ЮKassa виджета (загружается как внешний скрипт)
interface YooCheckoutWidgetInstance {
  render: (containerId: string) => void;
  destroy: () => void;
}
interface YooCheckoutWidgetOptions {
  confirmation_token: string;
  return_url: string;
  customization?: { colors?: { controlPrimary?: string } };
  error_callback?: (error: unknown) => void;
}
interface WindowWithYookassa extends Window {
  YooMoneyCheckoutWidget?: new (opts: YooCheckoutWidgetOptions) => YooCheckoutWidgetInstance;
}

interface Props {
  plan: SubscriptionPlan;
  planCode: string;
  initialPeriod: 'MONTHLY' | 'YEARLY';
}

export function CheckoutForm({ plan, planCode, initialPeriod }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>(initialPeriod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<YooCheckoutWidgetInstance | null>(null);
  const scriptLoadedRef = useRef(false);

  // Цены хранятся в копейках
  const price = period === 'MONTHLY' ? plan.priceMonthlyRub : plan.priceYearlyRub;
  const priceLabel = (price / 100).toLocaleString('ru-RU');

  // Загрузка скрипта ЮKassa виджета один раз при монтировании
  useEffect(() => {
    if (scriptLoadedRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
    script.async = true;
    document.head.appendChild(script);
    scriptLoadedRef.current = true;
    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workspaces/active/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode, billingPeriod: period }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Ошибка при создании платежа');
        return;
      }

      const { confirmationToken } = json.data as { confirmationToken: string };
      const win = window as unknown as WindowWithYookassa;
      if (!win.YooMoneyCheckoutWidget) {
        setError('Виджет оплаты не загрузился. Обновите страницу.');
        return;
      }

      widgetRef.current?.destroy();
      const widget = new win.YooMoneyCheckoutWidget({
        confirmation_token: confirmationToken,
        return_url: `${window.location.origin}/settings/subscription?success=1`,
        customization: { colors: { controlPrimary: '#2563EB' } },
        error_callback: () => {
          setError('Ошибка виджета оплаты. Попробуйте ещё раз.');
        },
      });
      widget.render('yookassa-payment-form');
      widgetRef.current = widget;
    } catch {
      setError('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Оформление подписки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {priceLabel} ₽ / {period === 'MONTHLY' ? 'месяц' : 'год'}
            </p>
          </div>

          {/* Переключатель периода оплаты */}
          <div className="flex gap-2">
            <Button
              variant={period === 'MONTHLY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('MONTHLY')}
            >
              Месяц
            </Button>
            <Button
              variant={period === 'YEARLY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('YEARLY')}
            >
              Год <span className="ml-1 text-green-300 text-xs">−20%</span>
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button className="w-full" onClick={handlePay} disabled={loading}>
            {loading ? 'Подготовка платежа...' : `Оплатить ${priceLabel} ₽`}
          </Button>
        </CardContent>
      </Card>

      {/* Контейнер для ЮKassa виджета — заполняется после handlePay */}
      <div id="yookassa-payment-form" />

      <Button variant="ghost" className="w-full" onClick={() => router.back()}>
        Назад
      </Button>
    </div>
  );
}
