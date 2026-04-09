import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createVersionSchema = z.object({
  name: z.string().min(1).max(200),
  stageId: z.string().uuid().optional(),
  isDirective: z.boolean().optional().default(false),
  description: z.string().max(1000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Получаем все версии ГПР объекта с автором, стадией и количеством задач
    const versions = await db.ganttVersion.findMany({
      where: { projectId: params.objectId },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        stage: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(versions);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
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

    const body: unknown = await req.json();
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, stageId, isDirective, description } = parsed.data;

    // Создаём новую версию ГПР на уровне объекта (без контракта — contractId optional)
    const version = await db.ganttVersion.create({
      data: {
        name,
        stageId: stageId ?? null,
        isDirective: isDirective ?? false,
        description: description ?? null,
        projectId: params.objectId,
        createdById: session.user.id,
      },
    });

    return successResponse(version);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
