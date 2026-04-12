import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET — дерево категорий смет проекта (корни + дочерние, с количеством версий) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загружаем корневые категории с дочерними и счётчиком версий
    const categories = await db.estimateCategory.findMany({
      where: { projectId: params.projectId, parentId: null },
      include: {
        children: {
          include: {
            _count: { select: { versions: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { versions: true } },
      },
      orderBy: { order: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения категорий смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  parentId: z.string().uuid().optional(),
});

/** POST — создать категорию смет */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    // Если передан parentId — проверяем что родитель принадлежит тому же проекту
    if (data.parentId) {
      const parent = await db.estimateCategory.findFirst({
        where: { id: data.parentId, projectId: params.projectId },
      });
      if (!parent) return errorResponse('Родительская категория не найдена', 404);
    }

    // Определяем порядок — следующий среди сиблингов
    const siblingCount = await db.estimateCategory.count({
      where: { projectId: params.projectId, parentId: data.parentId ?? null },
    });

    const category = await db.estimateCategory.create({
      data: {
        name: data.name,
        order: siblingCount,
        parentId: data.parentId ?? null,
        projectId: params.projectId,
      },
    });

    return successResponse(category);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания категории смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
