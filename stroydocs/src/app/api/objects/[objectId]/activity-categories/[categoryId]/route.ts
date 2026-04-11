import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateCategorySchema = z.object({
  name:     z.string().min(1).optional(),
  order:    z.number().int().optional(),
  isHidden: z.boolean().optional(),
});

// Обновить категорию мероприятий
export async function PUT(
  req: NextRequest,
  { params }: { params: { objectId: string; categoryId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const category = await db.activityCategory.findFirst({
      where: { id: params.categoryId, projectId: params.objectId },
    });
    if (!category) return errorResponse('Категория не найдена', 404);

    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.activityCategory.update({
      where: { id: params.categoryId },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления категории мероприятий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить категорию мероприятий
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; categoryId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const category = await db.activityCategory.findFirst({
      where: { id: params.categoryId, projectId: params.objectId },
    });
    if (!category) return errorResponse('Категория не найдена', 404);

    // Системные категории нельзя удалить — только скрыть
    if (category.isSystem) {
      return errorResponse('Системную категорию нельзя удалить. Используйте «Настроить категории» для скрытия.', 400);
    }

    await db.activityCategory.delete({ where: { id: params.categoryId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления категории мероприятий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
