import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createCategorySchema = z.object({
  name:     z.string().min(1, 'Введите название категории'),
  order:    z.number().int().optional(),
  parentId: z.string().optional(),
});

// Получить список категорий мероприятий проекта
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    // showHidden=true → показать все категории (для ConfigureCategoriesDialog)
    const showHidden = searchParams.get('showHidden') === 'true';

    const categories = await db.activityCategory.findMany({
      where: {
        projectId: params.projectId,
        ...(showHidden ? {} : { isHidden: false }),
      },
      orderBy: { order: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения категорий мероприятий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать категорию мероприятий
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } },
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
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, order = 0, parentId } = parsed.data;

    const category = await db.activityCategory.create({
      data: {
        name,
        order,
        parentId: parentId ?? null,
        projectId: params.projectId,
      },
    });

    return successResponse(category);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания категории мероприятий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
