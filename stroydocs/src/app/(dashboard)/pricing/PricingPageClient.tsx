'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@prisma/client';
import { BillingCycleToggle, type BillingCycle } from '@/components/pricing/BillingCycleToggle';
import { AudienceTabsSwitcher, type AudienceTab } from '@/components/pricing/AudienceTabsSwitcher';
import { PricingGrid } from '@/components/pricing/PricingGrid';
import { FeatureMatrix } from '@/components/pricing/FeatureMatrix';
import { FaqSection } from '@/components/pricing/FaqSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Props {
  plans: SubscriptionPlan[];
  currentPlanCode: string;
  isAuthenticated: boolean;
}

function filterByTab(plans: SubscriptionPlan[], tab: AudienceTab): SubscriptionPlan[] {
  if (tab === 'B2B') {
    return plans.filter(
      (p) => p.category === 'B2B' || p.category === 'FREEMIUM' || p.planType === 'FREE'
    );
  }
  if (tab === 'PROFI') {
    return plans.filter((p) => p.category === 'B2C' && p.profiRole !== null);
  }
  return plans.filter((p) => p.category === 'B2C' && p.profiRole === null);
}

export function PricingPageClient({ plans, currentPlanCode, isAuthenticated }: Props) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [activeTab, setActiveTab] = useState<AudienceTab>('B2B');

  const filteredPlans = filterByTab(plans, activeTab);

  return (
    <div className="space-y-12 py-8">
      {/* Заголовок */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Тарифы StroyDocs</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Выберите тариф, подходящий вашей роли и задачам. Все тарифы включают 7 дней бесплатного пробного периода.
        </p>
        <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
      </div>

      {/* Переключатель аудитории */}
      <div className="flex justify-center">
        <AudienceTabsSwitcher value={activeTab} onChange={setActiveTab} />
      </div>

      {/* Сетка тарифов */}
      <PricingGrid
        plans={plans}
        billingCycle={billingCycle}
        currentPlanCode={currentPlanCode}
        isAuthenticated={isAuthenticated}
        activeTab={activeTab}
      />

      {/* Таблица функций */}
      {filteredPlans.length > 0 && (
        <FeatureMatrix plans={filteredPlans} activeTab={activeTab} />
      )}

      {/* FAQ */}
      <FaqSection />

      {/* CTA блок */}
      <section className="text-center rounded-lg border bg-muted/30 py-10 px-6 space-y-3">
        <h2 className="text-lg font-semibold">Не нашли подходящий тариф?</h2>
        <p className="text-sm text-muted-foreground">
          Свяжитесь с нами — подберём решение под ваши задачи или оформим корпоративный договор.
        </p>
        <Button asChild>
          <Link href="mailto:sales@stroydocs.ru">Связаться с отделом продаж</Link>
        </Button>
      </section>
    </div>
  );
}
