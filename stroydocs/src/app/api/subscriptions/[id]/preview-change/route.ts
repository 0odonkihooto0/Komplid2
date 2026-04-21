import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { calculateProration } from '@/lib/payments/proration';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface ExceedingLimit {
  field: string;
  label: string;
  current: number;
  limit: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();

    const sub = await db.subscription.findFirst({
      where: { id: params.id, workspaceId },
      include: { plan: true },
    });
    if (!sub) return errorResponse('Подписка не найдена', 404);

    const newPlanId = req.nextUrl.searchParams.get('planId');
    if (!newPlanId) return errorResponse('planId обязателен', 400);

    const newPlan = await db.subscriptionPlan.findFirst({
      where: { id: newPlanId, isActive: true },
    });
    if (!newPlan) return errorResponse('Тарифный план не найден', 404);

    const oldPrice = sub.billingPeriod === 'MONTHLY' ? sub.plan.priceMonthlyRub : sub.plan.priceYearlyRub;
    const newPrice = sub.billingPeriod === 'MONTHLY' ? newPlan.priceMonthlyRub : newPlan.priceYearlyRub;
    const direction: 'upgrade' | 'downgrade' | 'same' =
      newPrice > oldPrice ? 'upgrade' : newPrice < oldPrice ? 'downgrade' : 'same';

    // Ищем активную сохранённую карту
    const savedCard = sub.defaultPaymentMethodId
      ? await db.paymentMethod.findFirst({
          where: { id: sub.defaultPaymentMethodId, isActive: true },
        })
      : await db.paymentMethod.findFirst({
          where: { workspaceId, isDefault: true, isActive: true },
        });

    if (direction === 'upgrade' || direction === 'same') {
      const proration = calculateProration({
        currentPeriodEnd: sub.currentPeriodEnd,
        oldPriceRub: oldPrice,
        newPriceRub: newPrice,
        billingPeriod: sub.billingPeriod as 'MONTHLY' | 'YEARLY',
      });

      return successResponse({
        direction,
        newPlan: {
          id: newPlan.id,
          name: newPlan.name,
          code: newPlan.code,
          priceMonthlyRub: newPlan.priceMonthlyRub,
          priceYearlyRub: newPlan.priceYearlyRub,
        },
        hasSavedCard: !!savedCard,
        savedCard: savedCard
          ? {
              cardBrand: savedCard.cardBrand,
              cardLast4: savedCard.cardLast4,
              cardExpiryMonth: savedCard.cardExpiryMonth,
              cardExpiryYear: savedCard.cardExpiryYear,
            }
          : null,
        proration: {
          unusedCreditRub: proration.unusedCreditRub,
          newPlanCostRub: proration.newPlanCostRub,
          amountToChargeRub: proration.proratedAmountRub,
          daysRemaining: proration.daysRemaining,
          totalDays: proration.totalDays,
          periodEnd: sub.currentPeriodEnd.toISOString(),
        },
      });
    }

    // Downgrade — проверяем лимиты
    const [objectsCount, membersCount] = await Promise.all([
      db.buildingObject.count({ where: { workspaceId } }),
      db.workspaceMember.count({ where: { workspaceId } }),
    ]);

    const exceedingLimits: ExceedingLimit[] = [];
    if (newPlan.maxObjects !== null && objectsCount > newPlan.maxObjects) {
      exceedingLimits.push({
        field: 'maxObjects',
        label: 'Объекты строительства',
        current: objectsCount,
        limit: newPlan.maxObjects,
      });
    }
    if (newPlan.maxUsers !== null && membersCount > newPlan.maxUsers) {
      exceedingLimits.push({
        field: 'maxUsers',
        label: 'Участники воркспейса',
        current: membersCount,
        limit: newPlan.maxUsers,
      });
    }

    return successResponse({
      direction,
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        code: newPlan.code,
        priceMonthlyRub: newPlan.priceMonthlyRub,
        priceYearlyRub: newPlan.priceYearlyRub,
      },
      hasSavedCard: false,
      savedCard: null,
      exceedingLimits,
      effectiveAt: sub.currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при формировании превью', 500);
  }
}
