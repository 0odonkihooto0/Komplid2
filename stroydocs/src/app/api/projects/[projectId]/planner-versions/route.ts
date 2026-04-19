import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации текущего пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const versions = await db.projectManagementVersion.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });

    return successResponse(versions);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации текущего пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Первая версия проекта автоматически становится текущей
    const existingCount = await db.projectManagementVersion.count({
      where: { projectId: params.projectId },
    });
    const isCurrent = existingCount === 0;

    const version = await db.projectManagementVersion.create({
      data: {
        name: parsed.data.name,
        projectId: params.projectId,
        isCurrent,
      },
    });

    return successResponse(version);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания версии планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
