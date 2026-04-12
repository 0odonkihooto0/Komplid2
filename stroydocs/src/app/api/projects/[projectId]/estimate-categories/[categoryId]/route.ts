import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; categoryId: string } };

/** Проверяем доступ: организация → проект → категория */
async function resolveCategory(projectId: string, categoryId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  const category = await db.estimateCategory.findFirst({
    where: { id: categoryId, projectId },
    include: {
      _count: { select: { versions: true, children: true } },
    },
  });
  return category;
}

const patchCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
});

/** PATCH — переименовать категорию */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const category = await resolveCategory(
      params.projectId, params.categoryId, session.user.organizationId
    );
    if (!category) return errorResponse('Категория не найдена', 404);

    const body = await req.json();
    const parsed = patchCategorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await db.estimateCategory.update({
      where: { id: params.categoryId },
      data: { name: parsed.data.name },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления категории смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить категорию (только если пустая: нет смет и подкатегорий) */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const category = await resolveCategory(
      params.projectId, params.categoryId, session.user.organizationId
    );
    if (!category) return errorResponse('Категория не найдена', 404);

    // Проверяем что категория пустая
    if (category._count.versions > 0) {
      return errorResponse('Категория содержит сметы, удаление невозможно', 400);
    }
    if (category._count.children > 0) {
      return errorResponse('Категория содержит подкатегории, удаление невозможно', 400);
    }

    await db.estimateCategory.delete({ where: { id: params.categoryId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления категории смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
