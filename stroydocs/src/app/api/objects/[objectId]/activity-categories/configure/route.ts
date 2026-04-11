import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const configureSchema = z.object({
  // IDs системных категорий, которые должны быть ВИДИМЫ (isHidden=false)
  categoryIds: z.array(z.string()),
});

// Массово включить/выключить системные категории мероприятий
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = configureSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { categoryIds } = parsed.data;

    // Получаем все системные категории проекта
    const systemCategories = await db.activityCategory.findMany({
      where: { projectId: params.objectId, isSystem: true },
      select: { id: true },
    });

    const enabledSet = new Set(categoryIds);

    // Обновляем isHidden для каждой системной категории в транзакции
    await db.$transaction(
      systemCategories.map((cat) =>
        db.activityCategory.update({
          where: { id: cat.id },
          data: { isHidden: !enabledSet.has(cat.id) },
        }),
      ),
    );

    return successResponse({ updated: systemCategories.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка настройки категорий мероприятий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
