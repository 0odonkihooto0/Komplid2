import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  amount: z.number().optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED']).optional(),
  approvedBy: z.string().max(200).optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; orderId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const order = await db.changeOrder.findFirst({
      where: { id: params.orderId, contractId: params.contractId },
    });
    if (!order) return errorResponse('Доп. соглашение не найдено', 404);

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { status, ...rest } = parsed.data;

    const updated = await db.changeOrder.update({
      where: { id: params.orderId },
      data: {
        ...rest,
        ...(status && { status }),
        // При утверждении фиксируем дату
        ...(status === 'APPROVED' && { approvedAt: new Date() }),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления доп. соглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; orderId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const order = await db.changeOrder.findFirst({
      where: { id: params.orderId, contractId: params.contractId },
    });
    if (!order) return errorResponse('Доп. соглашение не найдено', 404);

    // Только черновики можно удалять
    if (order.status !== 'DRAFT') {
      return errorResponse('Удалить можно только доп. соглашение в статусе черновика', 409);
    }

    await db.changeOrder.delete({ where: { id: params.orderId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления доп. соглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
