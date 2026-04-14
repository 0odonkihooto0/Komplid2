import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET — дерево категорий ИД проекта (корни + дочерние, со счётчиком документов) */
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

    // Загружаем корневые категории с дочерними и счётчиком документов
    const categories = await db.idDocCategory.findMany({
      where: { projectId: params.projectId, parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                _count: { select: { executionDocs: true, ks2Acts: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { executionDocs: true, ks2Acts: true, children: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { executionDocs: true, ks2Acts: true, children: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения категорий ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  parentId: z.string().uuid().optional(),
});

/** POST — создать категорию ИД */
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
    const { name, parentId } = parsed.data;

    // Если передан parentId — проверяем что родитель принадлежит тому же проекту
    if (parentId) {
      const parent = await db.idDocCategory.findFirst({
        where: { id: parentId, projectId: params.projectId },
      });
      if (!parent) return errorResponse('Родительская категория не найдена', 404);
    }

    // Определяем порядок — следующий среди сиблингов
    const siblingCount = await db.idDocCategory.count({
      where: { projectId: params.projectId, parentId: parentId ?? null },
    });

    const category = await db.idDocCategory.create({
      data: {
        name,
        sortOrder: siblingCount,
        parentId: parentId ?? null,
        projectId: params.projectId,
        isTemplate: false,
      },
    });

    return successResponse(category);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания категории ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
