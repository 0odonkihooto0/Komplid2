import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { SubscriptionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Статусы подписок, для которых обновляем метод оплаты по умолчанию
const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'GRACE',
];

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();
    const { id } = await params;

    const method = await db.paymentMethod.findFirst({
      where: { id, workspaceId, isActive: true },
    });
    if (!method) return errorResponse('Метод оплаты не найден', 404);

    await db.$transaction(async (tx) => {
      // Сбросить isDefault у всех методов workspace
      await tx.paymentMethod.updateMany({
        where: { workspaceId },
        data: { isDefault: false },
      });
      // Поставить isDefault на выбранный
      await tx.paymentMethod.update({ where: { id }, data: { isDefault: true } });
      // Обновить defaultPaymentMethodId в активной подписке
      await tx.subscription.updateMany({
        where: { workspaceId, status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
        data: { defaultPaymentMethodId: id },
      });
    });

    return successResponse({ updated: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при обновлении метода оплаты', 500);
  }
}
