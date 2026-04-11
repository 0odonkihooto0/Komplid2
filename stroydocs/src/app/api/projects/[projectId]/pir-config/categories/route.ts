import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// GET — список категорий для конфига ПИР
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const config = await db.pIRObjectTypeConfig.findUnique({
      where: { projectId: params.projectId },
      select: { id: true },
    });
    if (!config) return errorResponse('Конфигурация ПИР не найдена', 404);

    const categories = await db.pIRCategoryConfig.findMany({
      where: { configId: config.id },
      orderBy: { order: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения категорий ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const updateSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      enabled: z.boolean().optional(),
      order: z.number().int().optional(),
    })
  ),
});

// PATCH — массовое обновление enabled/order категорий
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const config = await db.pIRObjectTypeConfig.findUnique({
      where: { projectId: params.projectId },
      select: { id: true },
    });
    if (!config) return errorResponse('Конфигурация ПИР не найдена', 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { updates } = parsed.data;

    // Обновляем в транзакции
    await db.$transaction(
      updates.map((u) =>
        db.pIRCategoryConfig.update({
          where: { id: u.id },
          data: {
            ...(u.enabled !== undefined && { enabled: u.enabled }),
            ...(u.order !== undefined && { order: u.order }),
          },
        })
      )
    );

    // Вернуть обновлённый список
    const categories = await db.pIRCategoryConfig.findMany({
      where: { configId: config.id },
      orderBy: { order: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления категорий ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
