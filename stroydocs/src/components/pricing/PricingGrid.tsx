'use client';

import type { SubscriptionPlan } from '@prisma/client';
import { PricingPlanCard } from './PricingPlanCard';
import type { BillingCycle } from './BillingCycleToggle';
import type { AudienceTab } from './AudienceTabsSwitcher';

interface Props {
  plans: SubscriptionPlan[];
  billingCycle: BillingCycle;
  currentPlanCode?: string;
  isAuthenticated: boolean;
  activeTab: AudienceTab;
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
  // B2C: customer-facing plans without a profi role
  return plans.filter((p) => p.category === 'B2C' && p.profiRole === null);
}

export function PricingGrid({ plans, billingCycle, currentPlanCode, isAuthenticated, activeTab }: Props) {
  const filtered = filterByTab(plans, activeTab);

  if (filtered.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Тарифы для этой категории пока не настроены.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((plan) => (
        <PricingPlanCard
          key={plan.id}
          plan={plan}
          billingCycle={billingCycle}
          currentPlanCode={currentPlanCode}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
