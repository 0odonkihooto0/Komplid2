import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[projectId]/supplier-orders/[oid]/conduct
 * Перевод заказа из статуса DRAFT → SENT (отправить поставщику).
 * Только заказы в статусе DRAFT могут быть отправлены.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; oid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Получение заказа и проверка его принадлежности проекту
    const order = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!order) return errorResponse('Заказ не найден', 404);

    // Перевод возможен только из статуса DRAFT
    if (order.status !== 'DRAFT') {
      return errorResponse(
        `Невозможно отправить заказ в статусе ${order.status}. Допустимый статус: DRAFT`,
        409
      );
    }

    // Обновление статуса на SENT
    const updated = await db.supplierOrder.update({
      where: { id: params.oid },
      data: { status: 'SENT' },
      include: {
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        supplierOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отправки заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
