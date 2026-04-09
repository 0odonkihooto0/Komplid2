import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { compareVersions } from '@/lib/gantt/compare-versions';

export const dynamic = 'force-dynamic';

// Схема валидации query-параметров: два UUID версий для сравнения
const querySchema = z.object({
  v1: z.string().uuid('v1 должен быть UUID'),
  v2: z.string().uuid('v2 должен быть UUID'),
});

/**
 * GET /api/objects/[objectId]/gantt-versions/compare?v1=uuid1&v2=uuid2
 * Сравнивает задачи двух версий ГПР и возвращает diff.
 * Обе версии должны принадлежать данному объекту.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Парсинг и валидация query-параметров
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { v1: v1Id, v2: v2Id } = parsed.data;

    // Загружаем обе версии и проверяем принадлежность объекту
    const [v1, v2] = await Promise.all([
      db.ganttVersion.findFirst({ where: { id: v1Id, projectId: params.objectId } }),
      db.ganttVersion.findFirst({ where: { id: v2Id, projectId: params.objectId } }),
    ]);

    if (!v1) return errorResponse('Версия v1 не найдена или не принадлежит объекту', 404);
    if (!v2) return errorResponse('Версия v2 не найдена или не принадлежит объекту', 404);

    // Загружаем задачи обеих версий
    const [v1Tasks, v2Tasks] = await Promise.all([
      db.ganttTask.findMany({
        where: { versionId: v1Id },
        orderBy: { sortOrder: 'asc' },
      }),
      db.ganttTask.findMany({
        where: { versionId: v2Id },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    // Выполняем сравнение версий
    const diff = compareVersions(v1Tasks, v2Tasks);

    return successResponse({
      v1: { id: v1.id, name: v1.name },
      v2: { id: v2.id, name: v2.name },
      diff,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сравнения версий ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
