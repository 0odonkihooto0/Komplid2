import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateStatusSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).nullable().optional(),
});

/**
 * PATCH /api/organizations/[orgId]/request-item-statuses/[sid]
 * Обновить название или цвет статуса позиции заявки.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; sid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    // Проверяем что статус принадлежит организации
    const existing = await db.materialRequestItemStatus.findFirst({
      where: { id: params.sid, organizationId: params.orgId },
    });
    if (!existing) return errorResponse('Статус не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.materialRequestItemStatus.update({
      where: { id: params.sid },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления статуса позиции заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/organizations/[orgId]/request-item-statuses/[sid]
 * Удалить статус. Связанные позиции получат statusId = null (SET NULL в FK).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string; sid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const existing = await db.materialRequestItemStatus.findFirst({
      where: { id: params.sid, organizationId: params.orgId },
    });
    if (!existing) return errorResponse('Статус не найден', 404);

    await db.materialRequestItemStatus.delete({ where: { id: params.sid } });

    return successResponse({ id: params.sid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления статуса позиции заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
