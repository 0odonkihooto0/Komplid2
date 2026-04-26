'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FEATURE_LABELS } from '@/utils/feature-labels';
import type { BillingCycle } from './BillingCycleToggle';
import type { SubscriptionPlan } from '@prisma/client';

interface Props {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  currentPlanCode?: string;
  isAuthenticated: boolean;
}

export function PricingPlanCard({ plan, billingCycle, currentPlanCode, isAuthenticated }: Props) {
  const price = billingCycle === 'MONTHLY' ? plan.priceMonthlyRub : plan.priceYearlyRub;
  // Цены хранятся в копейках
  const priceLabel = (price / 100).toLocaleString('ru-RU');
  const perLabel = billingCycle === 'MONTHLY' ? '/ мес' : '/ год';
  const isFree = plan.planType === 'FREE';
  const isCurrent = !!currentPlanCode && plan.code === currentPlanCode;
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];

  function renderCta() {
    if (isCurrent) {
      return (
        <Button variant="outline" className="w-full" disabled>
          Ваш тариф
        </Button>
      );
    }
    if (isFree) {
      return (
        <Button variant="ghost" className="w-full" disabled>
          Базовый доступ
        </Button>
      );
    }
    if (!isAuthenticated) {
      return (
        <Button asChild className="w-full">
          <Link href={`/signup?plan=${plan.code}`}>
            Попробовать бесплатно
          </Link>
        </Button>
      );
    }
    return (
      <Button asChild className="w-full">
        <Link href={`/settings/subscription/checkout/${plan.code}?period=${billingCycle}`}>
          Выбрать
        </Link>
      </Button>
    );
  }

  return (
    <Card
      className={[
        'flex flex-col',
        isCurrent ? 'border-primary ring-1 ring-primary' : '',
        plan.isFeatured ? 'shadow-lg' : '',
      ].join(' ')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <div className="flex gap-1 flex-shrink-0">
            {isCurrent && <Badge variant="default">Текущий</Badge>}
            {plan.isFeatured && !isCurrent && <Badge variant="secondary">Популярный</Badge>}
          </div>
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
        <div className="flex items-baseline gap-1 mt-2">
          {isFree ? (
            <span className="text-2xl font-bold">Бесплатно</span>
          ) : (
            <>
              <span className="text-2xl font-bold">{priceLabel} ₽</span>
              <span className="text-sm text-muted-foreground">{perLabel}</span>
            </>
          )}
        </div>
        {billingCycle === 'YEARLY' && !isFree && (
          <p className="text-xs text-green-600">Скидка 20% по сравнению с месячной</p>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-1.5">
          {features.slice(0, 7).map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" aria-hidden />
              {FEATURE_LABELS[f] ?? f}
            </li>
          ))}
          {features.length > 7 && (
            <li className="text-xs text-muted-foreground pl-5.5">
              + ещё {features.length - 7} функций
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter>{renderCta()}</CardFooter>
    </Card>
  );
}
