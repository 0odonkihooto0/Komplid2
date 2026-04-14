import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const saveValueSchema = z.object({
  fieldName: z.string().min(1),
  value: z.string().min(1).max(500),
});

/** GET /api/projects/[projectId]/saved-field-values?field=<fieldName>
 *  Возвращает список сохранённых значений для указанного поля и объекта.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const fieldName = req.nextUrl.searchParams.get('field');
    if (!fieldName) return errorResponse('Параметр field обязателен', 400);

    const items = await db.savedFieldValue.findMany({
      where: { fieldName, projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { value: true },
    });

    return successResponse(items.map((i) => i.value));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сохранённых значений полей');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST /api/projects/[projectId]/saved-field-values
 *  Сохраняет значение поля (upsert — дубликаты игнорируются).
 */
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
    const parsed = saveValueSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { fieldName, value } = parsed.data;

    const result = await db.savedFieldValue.upsert({
      where: {
        fieldName_value_projectId: { fieldName, value, projectId: params.projectId },
      },
      create: {
        fieldName,
        value,
        projectId: params.projectId,
        userId: session.user.id,
      },
      update: {},
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сохранения значения поля');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
