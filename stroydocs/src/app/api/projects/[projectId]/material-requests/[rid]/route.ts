import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема обновления заявки на материалы
const updateRequestSchema = z.object({
  deliveryDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']).optional(),
  supplierOrgId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  responsibleId: z.string().uuid().nullable().optional(),
});

// Вспомогательная функция: проверить что заявка принадлежит проекту
async function findRequest(rid: string, projectId: string) {
  return db.materialRequest.findFirst({
    where: { id: rid, projectId },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      include: {
        // Включаем позиции заявки с данными номенклатуры
        items: {
          include: {
            nomenclature: true,
            itemStatus: true,
          },
          orderBy: { id: 'asc' },
        },
        _count: { select: { items: true, orders: true, comments: true } },
        // Включаем маршрут согласования с шагами
        approvalRoute: {
          include: {
            steps: {
              orderBy: { stepIndex: 'asc' },
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!request) return errorResponse('Заявка не найдена', 404);

    return successResponse(request);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка что заявка принадлежит проекту
    const existing = await findRequest(params.rid, params.projectId);
    if (!existing) return errorResponse('Заявка не найдена', 404);

    const body = await req.json();
    const parsed = updateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { deliveryDate, ...rest } = parsed.data;

    const updated = await db.materialRequest.update({
      where: { id: params.rid },
      data: {
        ...rest,
        // Явная обработка nullable deliveryDate
        ...(deliveryDate !== undefined && {
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        }),
      },
      include: {
        _count: { select: { items: true, orders: true, comments: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка что заявка принадлежит проекту
    const existing = await findRequest(params.rid, params.projectId);
    if (!existing) return errorResponse('Заявка не найдена', 404);

    // Удаление разрешено только для черновиков
    if (existing.status !== 'DRAFT') {
      return errorResponse('Удаление возможно только для заявок в статусе "Черновик"', 400);
    }

    // Каскадное удаление позиций и самой заявки
    await db.$transaction([
      db.materialRequestItem.deleteMany({ where: { requestId: params.rid } }),
      db.materialRequest.delete({ where: { id: params.rid } }),
    ]);

    return successResponse({ id: params.rid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
