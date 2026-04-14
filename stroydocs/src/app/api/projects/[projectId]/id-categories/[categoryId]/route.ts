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

  const category = await db.idDocCategory.findFirst({
    where: { id: categoryId, projectId },
    include: {
      _count: { select: { executionDocs: true, ks2Acts: true, children: true } },
    },
  });
  return category;
}

const patchCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
});

/** PATCH — переименовать категорию ИД */
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

    const updated = await db.idDocCategory.update({
      where: { id: params.categoryId },
      data: { name: parsed.data.name },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления категории ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить категорию (только если нет документов и подкатегорий) */
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

    // Блокируем удаление если есть связанные документы или дочерние категории
    if (category._count.executionDocs > 0 || category._count.ks2Acts > 0) {
      return errorResponse('Категория содержит документы, удаление невозможно', 400);
    }
    if (category._count.children > 0) {
      return errorResponse('Категория содержит подкатегории, удаление невозможно', 400);
    }

    await db.idDocCategory.delete({ where: { id: params.categoryId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления категории ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
