import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const transferItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, 'Выберите хотя бы одну позицию').max(200),
});

/**
 * POST /api/projects/[projectId]/material-requests/[rid]/transfer-items
 * Перенести выбранные позиции в новую заявку (статус DRAFT).
 * Позиции удаляются из текущей заявки и добавляются в новую.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка что исходная заявка принадлежит проекту
    const sourceRequest = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { id: true, projectId: true },
    });
    if (!sourceRequest) return errorResponse('Заявка не найдена', 404);

    const body: unknown = await req.json();
    const parsed = transferItemsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { itemIds } = parsed.data;

    // Проверяем что все позиции принадлежат исходной заявке
    const items = await db.materialRequestItem.findMany({
      where: { id: { in: itemIds }, requestId: params.rid },
      select: { id: true },
    });
    if (items.length !== itemIds.length) {
      return errorResponse('Некоторые позиции не найдены в этой заявке', 400);
    }

    // В транзакции создаём новую заявку и переносим позиции
    const newRequest = await db.$transaction(async (tx) => {
      const created = await tx.materialRequest.create({
        data: {
          number: `LRV-${Date.now()}`,
          status: 'DRAFT',
          projectId: params.projectId,
          createdById: session.user.id,
        },
      });

      // Переносим позиции: меняем requestId
      await tx.materialRequestItem.updateMany({
        where: { id: { in: itemIds } },
        data: { requestId: created.id },
      });

      return created;
    });

    return successResponse({ newRequestId: newRequest.id, newRequest });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка переноса позиций заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
