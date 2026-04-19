import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createDocumentSchema = z.object({
  categoryId: z.string().min(1, 'Укажите категорию'),
  name:       z.string().min(1, 'Введите наименование'),
  type:       z.string().optional(),
  number:     z.string().optional(),
  date:       z.string().optional(), // ISO-строка, парсим вручную
  status:     z.string().optional(),
});

// Получить список документов мероприятий с пагинацией
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
    const categoryId = searchParams.get('categoryId');
    const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip  = (page - 1) * limit;

    const where = {
      projectId: params.projectId,
      ...(categoryId ? { categoryId } : {}),
    };

    const [data, total] = await db.$transaction([
      db.activityDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          category: { select: { id: true, name: true } },
          author:   { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.activityDocument.count({ where }),
    ]);

    return successResponse(data, {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов мероприятий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать документ мероприятия
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
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { categoryId, name, type, number, date, status } = parsed.data;

    // Проверяем что категория принадлежит этому проекту
    const category = await db.activityCategory.findFirst({
      where: { id: categoryId, projectId: params.projectId },
    });
    if (!category) return errorResponse('Категория не найдена', 404);

    const document = await db.activityDocument.create({
      data: {
        categoryId,
        projectId: params.projectId,
        name,
        type:     type ?? null,
        number:   number ?? null,
        date:     date ? new Date(date) : null,
        status:   status ?? 'В работе',
        authorId: session.user.id,
      },
      include: {
        category: { select: { id: true, name: true } },
        author:   { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(document);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания документа мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
