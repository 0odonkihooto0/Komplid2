import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; categoryId: string }

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
});

/** PATCH /api/projects/[projectId]/reports/categories/[categoryId] — переименовать / изменить порядок */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, categoryId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const category = await db.reportCategory.findFirst({
      where: { id: categoryId, projectId },
    });
    if (!category) return errorResponse('Категория не найдена', 404);

    const body: unknown = await req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.reportCategory.update({
      where: { id: categoryId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
        ...(parsed.data.parentId !== undefined ? { parentId: parsed.data.parentId } : {}),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления категории отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE /api/projects/[projectId]/reports/categories/[categoryId] — удалить категорию */
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, categoryId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const category = await db.reportCategory.findFirst({
      where: { id: categoryId, projectId },
      select: { id: true },
    });
    if (!category) return errorResponse('Категория не найдена', 404);

    // Отвязываем отчёты от удаляемой категории (cascade = SetNull через schema)
    await db.reportCategory.delete({ where: { id: categoryId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления категории отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
