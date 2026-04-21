'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChangePlanPreviewModal } from '@/components/subscriptions/ChangePlanPreviewModal';
import { DowngradeWarningModal } from '@/components/subscriptions/DowngradeWarningModal';
import type { SubscriptionPlan } from '@prisma/client';

const FEATURE_LABELS: Record<string, string> = {
  estimates: 'Сметы',
  execution_docs: 'Исполнительная документация',
  aosr_generation: 'Генерация АОСР',
  journals_basic: 'Журналы (базовые)',
  journals_full: 'Журналы (полные)',
  mobile_pwa: 'Мобильное приложение',
  defects_full: 'Полный модуль СК',
  approval_routes: 'Маршруты согласования',
  xml_minstroy_export: 'Экспорт для Минстроя',
};

interface Props {
  plans: SubscriptionPlan[];
  currentPlan: SubscriptionPlan | null;
  subscriptionId: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  currentPeriodEnd: string;
}

type ModalState =
  | { type: 'upgrade'; plan: SubscriptionPlan }
  | { type: 'downgrade'; plan: SubscriptionPlan }
  | null;

export function PlanSelector({ plans, currentPlan, subscriptionId, billingPeriod, currentPeriodEnd }: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  function getPlanDirection(plan: SubscriptionPlan): 'current' | 'upgrade' | 'downgrade' | 'free' {
    if (!currentPlan || plan.id === currentPlan.id) return 'current';
    if (plan.planType === 'FREE') return 'free';
    const currentPrice = billingPeriod === 'MONTHLY' ? currentPlan.priceMonthlyRub : currentPlan.priceYearlyRub;
    const planPrice = billingPeriod === 'MONTHLY' ? plan.priceMonthlyRub : plan.priceYearlyRub;
    return planPrice > currentPrice ? 'upgrade' : 'downgrade';
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const direction = getPlanDirection(plan);
          const price = billingPeriod === 'MONTHLY' ? plan.priceMonthlyRub : plan.priceYearlyRub;
          const priceLabel = (price / 100).toLocaleString('ru-RU');
          const isCurrent = direction === 'current';
          const features = Array.isArray(plan.features) ? plan.features as string[] : [];

          return (
            <Card
              key={plan.id}
              className={`flex flex-col ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
                    {isCurrent && <Badge variant="default">Текущий</Badge>}
                    {plan.isFeatured && !isCurrent && <Badge variant="secondary">Популярный</Badge>}
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  {plan.planType === 'FREE' ? (
                    <span className="text-2xl font-bold">Бесплатно</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">{priceLabel} ₽</span>
                      <span className="text-sm text-muted-foreground">
                        {billingPeriod === 'MONTHLY' ? '/ мес' : '/ год'}
                      </span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-1.5">
                  {features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" aria-hidden />
                      {FEATURE_LABELS[f] ?? f}
                    </li>
                  ))}
                  {features.length > 6 && (
                    <li className="text-xs text-muted-foreground">+ ещё {features.length - 6} функций</li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Текущий тариф
                  </Button>
                ) : direction === 'free' ? (
                  <Button variant="ghost" className="w-full" disabled>
                    Базовый доступ
                  </Button>
                ) : direction === 'upgrade' ? (
                  <Button
                    className="w-full"
                    onClick={() => setModal({ type: 'upgrade', plan })}
                  >
                    Перейти на {plan.name}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setModal({ type: 'downgrade', plan })}
                  >
                    Понизить до {plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {modal?.type === 'upgrade' && (
        <ChangePlanPreviewModal
          subscriptionId={subscriptionId}
          newPlan={modal.plan}
          billingPeriod={billingPeriod}
          open={true}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'downgrade' && (
        <DowngradeWarningModal
          subscriptionId={subscriptionId}
          newPlan={modal.plan}
          billingPeriod={billingPeriod}
          open={true}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
