'use client';

import type { SubscriptionPlan, Subscription } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  isInGracePeriod: boolean;
}

export function SubscriptionStatus({ plan, subscription, isInGracePeriod }: Props) {
  if (!subscription || plan.planType === 'FREE') return null;

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('ru-RU')
    : null;

  return (
    <Card className={isInGracePeriod ? 'border-yellow-400' : ''}>
      <CardContent className="pt-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium">{plan.name}</p>
          {periodEnd && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancelAtPeriodEnd ? 'Отменяется' : 'Следующее списание'}: {periodEnd}
            </p>
          )}
          {isInGracePeriod && (
            <p className="text-sm text-yellow-600">Просрочен платёж — grace-период</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {subscription.status}
          </Badge>
          {!subscription.cancelAtPeriodEnd && (
            <form action="/api/workspaces/active/subscription/cancel" method="POST">
              <Button variant="ghost" size="sm" type="submit">
                Отменить автопродление
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
