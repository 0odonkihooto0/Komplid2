import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();
    const { id } = await params;

    // Проверка принадлежности к workspace
    const method = await db.paymentMethod.findFirst({
      where: { id, workspaceId, isActive: true },
    });
    if (!method) return errorResponse('Метод оплаты не найден', 404);

    await db.$transaction(async (tx) => {
      // Деактивировать метод
      await tx.paymentMethod.update({
        where: { id },
        data: { isActive: false, deactivatedAt: new Date() },
      });

      // Если был default — назначить следующий активный
      if (method.isDefault) {
        const next = await tx.paymentMethod.findFirst({
          where: { workspaceId, isActive: true, id: { not: id } },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
        }
        // Очистить defaultPaymentMethodId у подписки
        await tx.subscription.updateMany({
          where: { workspaceId, defaultPaymentMethodId: id },
          data: { defaultPaymentMethodId: next?.id ?? null },
        });
      }
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при удалении метода оплаты', 500);
  }
}
